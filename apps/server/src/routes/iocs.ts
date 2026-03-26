import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db, schema } from '@threatpad/db';
import { extractIocs } from '@threatpad/shared';
import { exportRegistry } from '../plugins/exporters/index.js';

export async function iocRoutes(app: FastifyInstance) {
  app.addHook('preHandler', (app as any).verifyJwt);

  // Extract IOCs from a note
  app.post('/:noteId/extract-iocs', async (request, reply) => {
    const { noteId } = request.params as { noteId: string };

    const note = await db.query.notes.findFirst({
      where: eq(schema.notes.id, noteId),
    });

    if (!note) {
      return reply.status(404).send({ error: 'Not Found', message: 'Note not found' });
    }

    // Extract IOCs using shared utility
    const extracted = extractIocs(note.contentMd);

    // Clear existing IOCs for this note, then insert fresh
    await db.delete(schema.noteIocs).where(eq(schema.noteIocs.noteId, noteId));

    for (const ioc of extracted) {
      await db.insert(schema.noteIocs).values({
        noteId,
        type: ioc.type as any,
        value: ioc.value,
        defangedValue: ioc.defangedValue,
        context: ioc.context,
      });
    }

    // Return fresh list
    const iocs = await db.query.noteIocs.findMany({
      where: eq(schema.noteIocs.noteId, noteId),
    });

    return { data: iocs, extractedCount: extracted.length };
  });

  // Get IOCs for a note
  app.get('/:noteId/iocs', async (request, reply) => {
    const { noteId } = request.params as { noteId: string };

    const note = await db.query.notes.findFirst({
      where: eq(schema.notes.id, noteId),
    });

    if (!note) {
      return reply.status(404).send({ error: 'Not Found', message: 'Note not found' });
    }

    const iocs = await db.query.noteIocs.findMany({
      where: eq(schema.noteIocs.noteId, noteId),
    });

    return { data: iocs };
  });

  // Export IOCs (plugin-based)
  app.get('/:noteId/iocs/export', async (request, reply) => {
    const { noteId } = request.params as { noteId: string };
    const { format = 'json' } = request.query as { format?: string };

    const plugin = exportRegistry.get(format);
    if (!plugin) {
      const available = exportRegistry.list().map((f) => f.key).join(', ');
      return reply.status(400).send({
        error: 'Bad Request',
        message: `Unknown export format "${format}". Available: ${available}`,
      });
    }

    const iocs = await db.query.noteIocs.findMany({
      where: eq(schema.noteIocs.noteId, noteId),
    });

    const note = await db.query.notes.findFirst({
      where: eq(schema.notes.id, noteId),
    });

    const result = await plugin.export({ noteId, iocs, note });

    reply.header('Content-Type', result.contentType);
    reply.header('Content-Disposition', `attachment; filename="${result.filename}"`);
    return reply.send(typeof result.data === 'object' ? JSON.stringify(result.data) : result.data);
  });

  // Delete a specific IOC
  app.delete('/:noteId/iocs/:iocId', async (request, reply) => {
    const { iocId } = request.params as { iocId: string };

    await db.delete(schema.noteIocs).where(eq(schema.noteIocs.id, iocId));
    return reply.status(204).send();
  });
}
