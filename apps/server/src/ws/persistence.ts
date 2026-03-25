import * as Y from 'yjs';
import { db, schema } from '@threatpad/db';
import { eq } from 'drizzle-orm';

/**
 * Load persisted Yjs document state from Postgres.
 * The yjs_state column stores the binary encoded document state.
 */
export async function loadDocument(noteId: string, doc: Y.Doc): Promise<void> {
  const note = await db.query.notes.findFirst({
    where: eq(schema.notes.id, noteId),
    columns: { yjsState: true, contentMd: true },
  });

  if (!note) {
    throw new Error(`Note ${noteId} not found`);
  }

  if (note.yjsState) {
    // Apply persisted Yjs state
    const state = new Uint8Array(note.yjsState);
    Y.applyUpdate(doc, state);
  } else if (note.contentMd) {
    // No Yjs state yet — initialize from markdown content
    const ytext = doc.getText('content');
    ytext.insert(0, note.contentMd);
  }
}

/**
 * Persist Yjs document state to Postgres.
 * Stores both the binary Yjs state and extracted markdown text.
 */
export async function persistDocument(noteId: string, doc: Y.Doc): Promise<void> {
  const state = Y.encodeStateAsUpdate(doc);
  const ytext = doc.getText('content');
  const contentMd = ytext.toString();
  const wordCount = contentMd.split(/\s+/).filter((w: string) => w.length > 0).length;

  await db.update(schema.notes)
    .set({
      yjsState: Buffer.from(state),
      contentMd,
      wordCount,
      updatedAt: new Date(),
    })
    .where(eq(schema.notes.id, noteId));
}
