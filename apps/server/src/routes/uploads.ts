import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import { eq, and } from 'drizzle-orm';
import * as jose from 'jose';
import { db, schema } from '@threatpad/db';
import { env } from '../config/env.js';

// Magic byte signatures for allowed image types
const SIGNATURES: { bytes: number[]; offset: number; mime: string; ext: string; extra?: (buf: Buffer) => boolean }[] = [
  { bytes: [0x89, 0x50, 0x4E, 0x47], offset: 0, mime: 'image/png', ext: 'png' },
  { bytes: [0xFF, 0xD8, 0xFF], offset: 0, mime: 'image/jpeg', ext: 'jpg' },
  { bytes: [0x47, 0x49, 0x46, 0x38], offset: 0, mime: 'image/gif', ext: 'gif' },
  {
    bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, mime: 'image/webp', ext: 'webp',
    extra: (buf) => buf.length >= 12 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50,
  },
];

function detectImageType(buf: Buffer): { mime: string; ext: string } | null {
  for (const sig of SIGNATURES) {
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buf[sig.offset + i] !== sig.bytes[i]) { match = false; break; }
    }
    if (match && (!sig.extra || sig.extra(buf))) {
      return { mime: sig.mime, ext: sig.ext };
    }
  }
  // SVG: check for <svg tag in first 256 bytes
  const head = buf.subarray(0, 256).toString('utf-8').toLowerCase();
  if (head.includes('<svg')) {
    return { mime: 'image/svg+xml', ext: 'svg' };
  }
  return null;
}

export async function uploadRoutes(app: FastifyInstance) {
  // POST /:workspaceId/uploads — upload an image
  app.post('/:workspaceId/uploads', {
    preHandler: [(app as any).verifyJwt, (app as any).resolveWorkspaceRole, (app as any).requireRole('editor')],
  }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const userId = request.userId!;

    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ error: 'Bad Request', message: 'No file uploaded' });
    }

    // Read file into buffer (capped at 5MB by @fastify/multipart limits)
    const buf = await file.toBuffer();

    if (buf.length === 0) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Empty file' });
    }

    // Validate by magic bytes
    const detected = detectImageType(buf);
    if (!detected) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Unsupported file type. Allowed: PNG, JPEG, GIF, WebP, SVG' });
    }

    // Generate UUID filename and write to disk
    const filename = `${randomUUID()}.${detected.ext}`;
    const dir = join(env.UPLOAD_DIR, workspaceId);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), buf);

    // Insert metadata into DB
    const [upload] = await db.insert(schema.uploads).values({
      workspaceId,
      uploadedBy: userId,
      filename,
      originalName: file.filename || null,
      mimeType: detected.mime,
      sizeBytes: buf.length,
    }).returning();

    const url = `/api/workspaces/${workspaceId}/uploads/${upload!.id}`;
    return { id: upload!.id, url };
  });

  // GET /:workspaceId/uploads/:uploadId — serve an image (auth via header or query param)
  app.get('/:workspaceId/uploads/:uploadId', async (request, reply) => {
    const { workspaceId, uploadId } = request.params as { workspaceId: string; uploadId: string };

    // Auth: check Authorization header first, fall back to ?token= query param
    let userId: string | undefined;
    const authHeader = request.headers.authorization;
    const queryToken = (request.query as Record<string, string>).token;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : queryToken;

    if (!token) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Missing token' });
    }

    try {
      const secret = new TextEncoder().encode(env.JWT_SECRET);
      const { payload } = await jose.jwtVerify(token, secret);
      userId = payload.sub as string;
    } catch {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
    }

    // Check workspace membership
    const member = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(schema.workspaceMembers.workspaceId, workspaceId),
        eq(schema.workspaceMembers.userId, userId),
      ),
    });

    if (!member) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Not a workspace member' });
    }

    // Look up the upload
    const upload = await db.query.uploads.findFirst({
      where: and(
        eq(schema.uploads.id, uploadId),
        eq(schema.uploads.workspaceId, workspaceId),
      ),
    });

    if (!upload) {
      return reply.status(404).send({ error: 'Not Found', message: 'Upload not found' });
    }

    const filepath = join(env.UPLOAD_DIR, workspaceId, upload.filename);
    const stream = createReadStream(filepath);

    return reply
      .type(upload.mimeType)
      .header('Cache-Control', 'private, max-age=3600')
      .send(stream);
  });
}
