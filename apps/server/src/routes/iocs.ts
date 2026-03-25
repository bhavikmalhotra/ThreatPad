import crypto from 'crypto';
import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db, schema } from '@threatpad/db';
import { extractIocs, defang } from '@threatpad/shared';

function iocToStixPattern(type: string, value: string): string {
  const escaped = value.replace(/'/g, "\\'");
  switch (type) {
    case 'ipv4': return `[ipv4-addr:value = '${escaped}']`;
    case 'ipv6': return `[ipv6-addr:value = '${escaped}']`;
    case 'domain': return `[domain-name:value = '${escaped}']`;
    case 'url': return `[url:value = '${escaped}']`;
    case 'email': return `[email-addr:value = '${escaped}']`;
    case 'md5': return `[file:hashes.MD5 = '${escaped}']`;
    case 'sha1': return `[file:hashes.'SHA-1' = '${escaped}']`;
    case 'sha256': return `[file:hashes.'SHA-256' = '${escaped}']`;
    case 'cve': return `[vulnerability:name = '${escaped}']`;
    default: return `[artifact:payload_bin = '${escaped}']`;
  }
}

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

  // Export IOCs
  app.get('/:noteId/iocs/export', async (request, reply) => {
    const { noteId } = request.params as { noteId: string };
    const { format = 'json' } = request.query as { format?: string };

    const iocs = await db.query.noteIocs.findMany({
      where: eq(schema.noteIocs.noteId, noteId),
    });

    if (format === 'csv') {
      const header = 'type,value,defanged_value,confidence,context';
      const rows = iocs.map((ioc) =>
        `"${ioc.type}","${ioc.value}","${ioc.defangedValue || defang(ioc.value)}","${ioc.confidence}","${(ioc.context || '').replace(/"/g, '""')}"`,
      );
      const csv = [header, ...rows].join('\n');

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename="iocs-${noteId}.csv"`);
      return reply.send(csv);
    }

    if (format === 'stix') {
      const note = await db.query.notes.findFirst({
        where: eq(schema.notes.id, noteId),
      });

      const now = new Date().toISOString();
      const stixObjects: any[] = [];

      // Create an identity for the exporter
      const identityId = `identity--${crypto.randomUUID()}`;
      stixObjects.push({
        type: 'identity',
        spec_version: '2.1',
        id: identityId,
        created: now,
        modified: now,
        name: 'ThreatPad',
        identity_class: 'tool',
      });

      // If we have a note, create a Report object
      if (note) {
        const reportId = `report--${crypto.randomUUID()}`;
        const indicatorIds: string[] = [];

        // Create Indicator for each IOC
        for (const ioc of iocs) {
          const indicatorId = `indicator--${crypto.randomUUID()}`;
          indicatorIds.push(indicatorId);

          const pattern = iocToStixPattern(ioc.type, ioc.value);
          stixObjects.push({
            type: 'indicator',
            spec_version: '2.1',
            id: indicatorId,
            created: ioc.firstSeenAt || now,
            modified: now,
            name: `${ioc.type.toUpperCase()}: ${ioc.value}`,
            description: ioc.context || undefined,
            pattern,
            pattern_type: 'stix',
            valid_from: ioc.firstSeenAt || now,
            confidence: ioc.confidence || 100,
            created_by_ref: identityId,
            labels: [ioc.type],
          });
        }

        // Create the Report object linking all indicators
        stixObjects.push({
          type: 'report',
          spec_version: '2.1',
          id: reportId,
          created: note.createdAt,
          modified: note.updatedAt,
          name: note.title,
          description: `Exported from ThreatPad note: ${note.title}`,
          published: now,
          object_refs: indicatorIds,
          created_by_ref: identityId,
          report_types: ['threat-report'],
        });
      } else {
        // No note context — just export indicators
        for (const ioc of iocs) {
          const indicatorId = `indicator--${crypto.randomUUID()}`;
          const pattern = iocToStixPattern(ioc.type, ioc.value);
          stixObjects.push({
            type: 'indicator',
            spec_version: '2.1',
            id: indicatorId,
            created: ioc.firstSeenAt || now,
            modified: now,
            name: `${ioc.type.toUpperCase()}: ${ioc.value}`,
            pattern,
            pattern_type: 'stix',
            valid_from: ioc.firstSeenAt || now,
            confidence: ioc.confidence || 100,
            created_by_ref: identityId,
          });
        }
      }

      const bundle = {
        type: 'bundle',
        id: `bundle--${crypto.randomUUID()}`,
        objects: stixObjects,
      };

      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', `attachment; filename="stix-${noteId}.json"`);
      return reply.send(bundle);
    }

    // JSON export (default)
    const exportData = iocs.map((ioc) => ({
      type: ioc.type,
      value: ioc.value,
      defanged: ioc.defangedValue || defang(ioc.value),
      confidence: ioc.confidence,
      context: ioc.context,
    }));

    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', `attachment; filename="iocs-${noteId}.json"`);
    return reply.send({ iocs: exportData, noteId, exportedAt: new Date().toISOString() });
  });

  // Delete a specific IOC
  app.delete('/:noteId/iocs/:iocId', async (request, reply) => {
    const { iocId } = request.params as { iocId: string };

    await db.delete(schema.noteIocs).where(eq(schema.noteIocs.id, iocId));
    return reply.status(204).send();
  });
}
