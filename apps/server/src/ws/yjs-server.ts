import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import * as Y from 'yjs';
import { applyUpdate, encodeStateAsUpdate, encodeStateVector } from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { persistDocument, loadDocument } from './persistence.js';

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

interface YjsRoom {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  clients: Set<WebSocket>;
  persistTimer: ReturnType<typeof setTimeout> | null;
  lastModified: number;
}

const rooms = new Map<string, YjsRoom>();

function getOrCreateRoom(noteId: string): YjsRoom {
  let room = rooms.get(noteId);
  if (room) return room;

  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);

  room = {
    doc,
    awareness,
    clients: new Set(),
    persistTimer: null,
    lastModified: Date.now(),
  };

  rooms.set(noteId, room);
  return room;
}

function schedulePersist(noteId: string, room: YjsRoom) {
  if (room.persistTimer) clearTimeout(room.persistTimer);
  room.persistTimer = setTimeout(async () => {
    try {
      await persistDocument(noteId, room.doc);
      room.lastModified = Date.now();
    } catch (err) {
      console.error(`Failed to persist document ${noteId}:`, err);
    }
  }, 2000); // Debounce: persist 2s after last change
}

function broadcastToRoom(room: YjsRoom, sender: WebSocket, message: Uint8Array) {
  for (const client of room.clients) {
    if (client !== sender && client.readyState === 1) {
      client.send(message);
    }
  }
}

function handleMessage(noteId: string, room: YjsRoom, ws: WebSocket, data: Uint8Array) {
  const decoder = decoding.createDecoder(data);
  const messageType = decoding.readVarUint(decoder);

  switch (messageType) {
    case MESSAGE_SYNC: {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.readSyncMessage(decoder, encoder, room.doc, null);

      if (encoding.length(encoder) > 1) {
        ws.send(encoding.toUint8Array(encoder));
      }

      // Schedule persistence on any sync update
      schedulePersist(noteId, room);
      break;
    }
    case MESSAGE_AWARENESS: {
      const update = decoding.readVarUint8Array(decoder);
      awarenessProtocol.applyAwarenessUpdate(room.awareness, update, ws);

      // Broadcast awareness to all other clients
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(encoder, update);
      broadcastToRoom(room, ws, encoding.toUint8Array(encoder));
      break;
    }
  }
}

function sendSyncStep1(ws: WebSocket, doc: Y.Doc) {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(encoder, doc);
  ws.send(encoding.toUint8Array(encoder));
}

function sendAwarenessState(ws: WebSocket, awareness: awarenessProtocol.Awareness) {
  const states = awarenessProtocol.encodeAwarenessUpdate(
    awareness,
    Array.from(awareness.getStates().keys()),
  );
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
  encoding.writeVarUint8Array(encoder, states);
  ws.send(encoding.toUint8Array(encoder));
}

function cleanupRoom(noteId: string) {
  const room = rooms.get(noteId);
  if (!room || room.clients.size > 0) return;

  // Persist final state before cleanup
  if (room.persistTimer) clearTimeout(room.persistTimer);
  persistDocument(noteId, room.doc).catch((err) => {
    console.error(`Failed to persist document ${noteId} on cleanup:`, err);
  });

  room.awareness.destroy();
  room.doc.destroy();
  rooms.delete(noteId);
}

export function registerYjsWebSocket(app: FastifyInstance) {
  app.get('/ws/notes/:noteId', { websocket: true }, async (socket, request) => {
    const ws = socket as unknown as WebSocket;
    const { noteId } = request.params as { noteId: string };

    // Verify JWT from query param
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Missing token');
      return;
    }

    try {
      // Verify JWT using the app's verifyJwt (simplified — extract userId)
      const { payload } = await (app as any).verifyToken(token);
      const userId = payload.sub;
      if (!userId) throw new Error('Invalid token');

      const room = getOrCreateRoom(noteId);

      // Load persisted state if this is a fresh room
      if (room.clients.size === 0) {
        try {
          await loadDocument(noteId, room.doc);
        } catch {
          // No persisted state yet, start fresh
        }
      }

      room.clients.add(ws);

      // Send initial sync
      sendSyncStep1(ws, room.doc);

      // Send current awareness state
      if (room.awareness.getStates().size > 0) {
        sendAwarenessState(ws, room.awareness);
      }

      // Handle messages
      ws.on('message', (data: ArrayBuffer) => {
        try {
          handleMessage(noteId, room, ws, new Uint8Array(data));
        } catch (err) {
          console.error('Error handling WS message:', err);
        }
      });

      ws.on('close', () => {
        room.clients.delete(ws);
        awarenessProtocol.removeAwarenessStates(room.awareness, [room.doc.clientID], null);

        // Clean up empty rooms after delay
        if (room.clients.size === 0) {
          setTimeout(() => cleanupRoom(noteId), 30000);
        }
      });

      ws.on('error', (err) => {
        console.error(`WebSocket error for note ${noteId}:`, err);
        room.clients.delete(ws);
      });
    } catch {
      ws.close(4003, 'Unauthorized');
    }
  });
}

// Get active room stats (for health/monitoring)
export function getRoomStats() {
  const stats: Array<{ noteId: string; clients: number; lastModified: number }> = [];
  for (const [noteId, room] of rooms) {
    stats.push({
      noteId,
      clients: room.clients.size,
      lastModified: room.lastModified,
    });
  }
  return stats;
}
