import type { FastifyInstance } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import { db, schema } from '@threatpad/db';

export async function versionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', (app as any).verifyJwt);

  // List versions for a note
  app.get('/:noteId/versions', async (request) => {
    const { noteId } = request.params as { noteId: string };

    const versions = await db.query.noteVersions.findMany({
      where: eq(schema.noteVersions.noteId, noteId),
      orderBy: [desc(schema.noteVersions.versionNumber)],
    });

    // Enrich with creator info
    const enriched = await Promise.all(
      versions.map(async (v) => {
        const creator = await db.query.users.findFirst({
          where: eq(schema.users.id, v.createdBy),
        });
        return {
          ...v,
          createdByUser: creator
            ? { id: creator.id, email: creator.email, displayName: creator.displayName, avatarColor: creator.avatarColor }
            : null,
        };
      }),
    );

    return { data: enriched };
  });

  // Get a specific version
  app.get('/:noteId/versions/:versionId', async (request, reply) => {
    const { versionId } = request.params as { versionId: string };

    const version = await db.query.noteVersions.findFirst({
      where: eq(schema.noteVersions.id, versionId),
    });

    if (!version) {
      return reply.status(404).send({ error: 'Not Found', message: 'Version not found' });
    }

    return { data: version };
  });

  // Diff two versions
  app.get('/:noteId/versions/:v1/diff/:v2', async (request, reply) => {
    const { v1, v2 } = request.params as { v1: string; v2: string };

    const [version1, version2] = await Promise.all([
      db.query.noteVersions.findFirst({ where: eq(schema.noteVersions.id, v1) }),
      db.query.noteVersions.findFirst({ where: eq(schema.noteVersions.id, v2) }),
    ]);

    if (!version1 || !version2) {
      return reply.status(404).send({ error: 'Not Found', message: 'One or both versions not found' });
    }

    // Simple line-based diff
    const lines1 = version1.contentMd.split('\n');
    const lines2 = version2.contentMd.split('\n');

    const changes: Array<{ type: 'added' | 'removed' | 'unchanged'; line: string; lineNumber: number }> = [];
    const maxLen = Math.max(lines1.length, lines2.length);

    // Basic LCS-style diff
    const linesSet1 = new Set(lines1);
    const linesSet2 = new Set(lines2);

    let i = 0, j = 0;
    while (i < lines1.length || j < lines2.length) {
      if (i < lines1.length && j < lines2.length && lines1[i] === lines2[j]) {
        changes.push({ type: 'unchanged', line: lines1[i]!, lineNumber: j + 1 });
        i++;
        j++;
      } else if (i < lines1.length && !linesSet2.has(lines1[i]!)) {
        changes.push({ type: 'removed', line: lines1[i]!, lineNumber: i + 1 });
        i++;
      } else if (j < lines2.length && !linesSet1.has(lines2[j]!)) {
        changes.push({ type: 'added', line: lines2[j]!, lineNumber: j + 1 });
        j++;
      } else {
        // Lines exist in both but at different positions
        if (i < lines1.length) {
          changes.push({ type: 'removed', line: lines1[i]!, lineNumber: i + 1 });
          i++;
        }
        if (j < lines2.length) {
          changes.push({ type: 'added', line: lines2[j]!, lineNumber: j + 1 });
          j++;
        }
      }
    }

    const linesAdded = changes.filter((c) => c.type === 'added').length;
    const linesRemoved = changes.filter((c) => c.type === 'removed').length;

    return {
      data: {
        version1: { id: version1.id, versionNumber: version1.versionNumber, title: version1.title, createdAt: version1.createdAt },
        version2: { id: version2.id, versionNumber: version2.versionNumber, title: version2.title, createdAt: version2.createdAt },
        changes,
        summary: { linesAdded, linesRemoved },
      },
    };
  });

  // Restore a version (creates a new version from old content)
  app.post('/:noteId/versions/:versionId/restore', async (request, reply) => {
    const { noteId, versionId } = request.params as { noteId: string; versionId: string };

    const version = await db.query.noteVersions.findFirst({
      where: eq(schema.noteVersions.id, versionId),
    });

    if (!version) {
      return reply.status(404).send({ error: 'Not Found', message: 'Version not found' });
    }

    // Get latest version number
    const [latest] = await db.query.noteVersions.findMany({
      where: eq(schema.noteVersions.noteId, noteId),
      orderBy: [desc(schema.noteVersions.versionNumber)],
      limit: 1,
    });

    const nextVersion = (latest?.versionNumber || 0) + 1;

    // Create new version with restored content
    const [newVersion] = await db.insert(schema.noteVersions).values({
      noteId,
      contentMd: version.contentMd,
      title: version.title,
      versionNumber: nextVersion,
      createdBy: request.userId!,
      snapshotReason: 'restore',
    }).returning();

    // Update the note itself
    const wordCount = version.contentMd.split(/\s+/).filter((w: string) => w.length > 0).length;

    await db.update(schema.notes)
      .set({
        contentMd: version.contentMd,
        title: version.title,
        wordCount,
        updatedAt: new Date(),
      })
      .where(eq(schema.notes.id, noteId));

    return reply.status(201).send({ data: newVersion });
  });

  // Create a manual snapshot
  app.post('/:noteId/versions', async (request, reply) => {
    const { noteId } = request.params as { noteId: string };

    const note = await db.query.notes.findFirst({
      where: eq(schema.notes.id, noteId),
    });

    if (!note) {
      return reply.status(404).send({ error: 'Not Found', message: 'Note not found' });
    }

    // Get latest version number
    const [latest] = await db.query.noteVersions.findMany({
      where: eq(schema.noteVersions.noteId, noteId),
      orderBy: [desc(schema.noteVersions.versionNumber)],
      limit: 1,
    });

    const nextVersion = (latest?.versionNumber || 0) + 1;

    // Calculate diff from last version
    let linesAdded = 0;
    let linesRemoved = 0;
    if (latest) {
      const oldLines = latest.contentMd.split('\n');
      const newLines = note.contentMd.split('\n');
      const oldSet = new Set(oldLines);
      const newSet = new Set(newLines);
      linesAdded = newLines.filter((l) => !oldSet.has(l)).length;
      linesRemoved = oldLines.filter((l) => !newSet.has(l)).length;
    }

    const [version] = await db.insert(schema.noteVersions).values({
      noteId,
      contentMd: note.contentMd,
      title: note.title,
      versionNumber: nextVersion,
      createdBy: request.userId!,
      snapshotReason: 'manual',
      linesAdded,
      linesRemoved,
    }).returning();

    return reply.status(201).send({ data: version });
  });
}
