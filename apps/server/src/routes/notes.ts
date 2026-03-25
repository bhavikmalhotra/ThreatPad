import type { FastifyInstance } from 'fastify';
import { eq, and, isNull, desc, ilike, sql } from 'drizzle-orm';
import { db, schema } from '@threatpad/db';
import { createNoteSchema, updateNoteSchema } from '@threatpad/shared';

export async function noteRoutes(app: FastifyInstance) {
  app.addHook('preHandler', (app as any).verifyJwt);

  // List notes in workspace
  app.get('/:workspaceId/notes', {
    preHandler: [(app as any).resolveWorkspaceRole],
  }, async (request) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const { folderId, page = '1', limit = '20' } = request.query as Record<string, string>;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [
      eq(schema.notes.workspaceId, workspaceId),
      isNull(schema.notes.deletedAt),
    ];

    if (folderId) {
      conditions.push(eq(schema.notes.folderId, folderId));
    }

    // Filter out private notes that aren't owned by the user
    const allNotes = await db.query.notes.findMany({
      where: and(...conditions),
      orderBy: [desc(schema.notes.updatedAt)],
      limit: limitNum,
      offset,
    });

    const visibleNotes = allNotes.filter(
      (n) => n.visibility !== 'private' || n.createdBy === request.userId,
    );

    // Enrich with tags and creator info
    const enriched = await Promise.all(
      visibleNotes.map(async (note) => {
        const creator = await db.query.users.findFirst({
          where: eq(schema.users.id, note.createdBy),
        });

        const tagLinks = await db.query.noteTags.findMany({
          where: eq(schema.noteTags.noteId, note.id),
        });
        const tags = await Promise.all(
          tagLinks.map((tl) =>
            db.query.tags.findFirst({ where: eq(schema.tags.id, tl.tagId) }),
          ),
        );

        return {
          id: note.id,
          title: note.title,
          visibility: note.visibility,
          pinned: note.pinned,
          wordCount: note.wordCount,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          createdByUser: creator
            ? { id: creator.id, email: creator.email, displayName: creator.displayName, avatarColor: creator.avatarColor }
            : null,
          tags: tags.filter(Boolean),
          snippet: note.contentMd.slice(0, 200),
        };
      }),
    );

    return { data: enriched, page: pageNum, limit: limitNum };
  });

  // Create note
  app.post('/:workspaceId/notes', {
    preHandler: [(app as any).resolveWorkspaceRole, (app as any).requireRole('editor')],
  }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const body = createNoteSchema.parse(request.body);

    // If from template, get template content
    let contentMd = '';
    if (body.templateId) {
      const template = await db.query.noteTemplates.findFirst({
        where: eq(schema.noteTemplates.id, body.templateId),
      });
      if (template) contentMd = template.contentMd;
    }

    const [note] = await db.insert(schema.notes).values({
      workspaceId,
      folderId: body.folderId,
      title: body.title || 'Untitled',
      contentMd,
      visibility: body.visibility,
      templateId: body.templateId,
      createdBy: request.userId!,
    }).returning();

    // Add tags
    if (body.tags?.length) {
      await db.insert(schema.noteTags).values(
        body.tags.map((tagId) => ({ noteId: note!.id, tagId })),
      );
    }

    // Create initial version
    await db.insert(schema.noteVersions).values({
      noteId: note!.id,
      contentMd,
      title: body.title || 'Untitled',
      versionNumber: 1,
      createdBy: request.userId!,
      snapshotReason: 'manual',
    });

    await (app as any).audit({
      userId: request.userId!,
      workspaceId,
      action: 'create',
      resourceType: 'note',
      resourceId: note!.id,
    });

    return reply.status(201).send({ data: note });
  });

  // Get note
  app.get('/:workspaceId/notes/:noteId', {
    preHandler: [(app as any).resolveWorkspaceRole],
  }, async (request, reply) => {
    const { noteId } = request.params as { noteId: string };

    const note = await db.query.notes.findFirst({
      where: and(eq(schema.notes.id, noteId), isNull(schema.notes.deletedAt)),
    });

    if (!note) {
      return reply.status(404).send({ error: 'Not Found', message: 'Note not found' });
    }

    if (note.visibility === 'private' && note.createdBy !== request.userId) {
      return reply.status(403).send({ error: 'Forbidden', message: 'This is a private note' });
    }

    return { data: note };
  });

  // Update note
  app.patch('/:workspaceId/notes/:noteId', {
    preHandler: [(app as any).resolveWorkspaceRole, (app as any).requireRole('editor')],
  }, async (request) => {
    const { noteId } = request.params as { noteId: string };
    const body = updateNoteSchema.parse(request.body);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.folderId !== undefined) updates.folderId = body.folderId;
    if (body.visibility !== undefined) updates.visibility = body.visibility;
    if (body.pinned !== undefined) updates.pinned = body.pinned;

    const [updated] = await db.update(schema.notes)
      .set(updates)
      .where(eq(schema.notes.id, noteId))
      .returning();

    return { data: updated };
  });

  // Update note content (separate from metadata)
  app.put('/:workspaceId/notes/:noteId/content', {
    preHandler: [(app as any).resolveWorkspaceRole, (app as any).requireRole('editor')],
  }, async (request) => {
    const { noteId } = request.params as { noteId: string };
    const { contentMd } = request.body as { contentMd: string };

    const wordCount = contentMd.split(/\s+/).filter((w: string) => w.length > 0).length;

    const [updated] = await db.update(schema.notes)
      .set({ contentMd, wordCount, updatedAt: new Date() })
      .where(eq(schema.notes.id, noteId))
      .returning();

    // Auto-create version snapshot if content changed significantly
    // Check time since last version — only snapshot every 5 minutes
    const [lastVersion] = await db.query.noteVersions.findMany({
      where: eq(schema.noteVersions.noteId, noteId),
      orderBy: [desc(schema.noteVersions.versionNumber)],
      limit: 1,
    });

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (!lastVersion || new Date(lastVersion.createdAt) < fiveMinAgo) {
      const nextVersion = (lastVersion?.versionNumber || 0) + 1;

      let linesAdded = 0;
      let linesRemoved = 0;
      if (lastVersion) {
        const oldLines = lastVersion.contentMd.split('\n');
        const newLines = contentMd.split('\n');
        const oldSet = new Set(oldLines);
        const newSet = new Set(newLines);
        linesAdded = newLines.filter((l) => !oldSet.has(l)).length;
        linesRemoved = oldLines.filter((l) => !newSet.has(l)).length;
      }

      await db.insert(schema.noteVersions).values({
        noteId,
        contentMd,
        title: updated!.title,
        versionNumber: nextVersion,
        createdBy: request.userId!,
        snapshotReason: 'auto',
        linesAdded,
        linesRemoved,
      });
    }

    return { data: updated };
  });

  // Delete note (soft delete)
  app.delete('/:workspaceId/notes/:noteId', {
    preHandler: [(app as any).resolveWorkspaceRole, (app as any).requireRole('editor')],
  }, async (request, reply) => {
    const { workspaceId, noteId } = request.params as { workspaceId: string; noteId: string };

    await db.update(schema.notes)
      .set({ deletedAt: new Date() })
      .where(eq(schema.notes.id, noteId));

    await (app as any).audit({
      userId: request.userId!,
      workspaceId,
      action: 'delete',
      resourceType: 'note',
      resourceId: noteId,
    });

    return reply.status(204).send();
  });

  // Duplicate note
  app.post('/:workspaceId/notes/:noteId/duplicate', {
    preHandler: [(app as any).resolveWorkspaceRole, (app as any).requireRole('editor')],
  }, async (request, reply) => {
    const { workspaceId, noteId } = request.params as { workspaceId: string; noteId: string };

    const original = await db.query.notes.findFirst({
      where: eq(schema.notes.id, noteId),
    });

    if (!original) {
      return reply.status(404).send({ error: 'Not Found' });
    }

    const [copy] = await db.insert(schema.notes).values({
      workspaceId,
      folderId: original.folderId,
      title: `${original.title} (Copy)`,
      contentMd: original.contentMd,
      visibility: original.visibility,
      createdBy: request.userId!,
      wordCount: original.wordCount,
    }).returning();

    return reply.status(201).send({ data: copy });
  });

  // ── Note Sharing (Permissions) ──

  // List note permissions
  app.get('/:workspaceId/notes/:noteId/permissions', {
    preHandler: [(app as any).resolveWorkspaceRole],
  }, async (request) => {
    const { noteId } = request.params as { noteId: string };

    const perms = await db.query.notePermissions.findMany({
      where: eq(schema.notePermissions.noteId, noteId),
    });

    const enriched = await Promise.all(
      perms.map(async (p) => {
        const user = await db.query.users.findFirst({
          where: eq(schema.users.id, p.userId),
        });
        return {
          id: p.id,
          role: p.role,
          createdAt: p.createdAt,
          user: user ? {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            avatarColor: user.avatarColor,
          } : null,
        };
      }),
    );

    return { data: enriched };
  });

  // Share note with a user
  app.post('/:workspaceId/notes/:noteId/permissions', {
    preHandler: [(app as any).resolveWorkspaceRole, (app as any).requireRole('editor')],
  }, async (request, reply) => {
    const { workspaceId, noteId } = request.params as { workspaceId: string; noteId: string };
    const { email, role = 'viewer' } = request.body as { email: string; role?: string };

    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (!user) {
      return reply.status(404).send({ error: 'Not Found', message: 'User not found. They must register first.' });
    }

    // Check if already shared
    const existing = await db.query.notePermissions.findFirst({
      where: and(
        eq(schema.notePermissions.noteId, noteId),
        eq(schema.notePermissions.userId, user.id),
      ),
    });

    if (existing) {
      // Update role
      const [updated] = await db.update(schema.notePermissions)
        .set({ role: role as 'owner' | 'editor' | 'viewer' })
        .where(eq(schema.notePermissions.id, existing.id))
        .returning();
      return { data: updated, message: 'Permission updated' };
    }

    const [perm] = await db.insert(schema.notePermissions).values({
      noteId,
      userId: user.id,
      role: role as 'owner' | 'editor' | 'viewer',
      grantedBy: request.userId!,
    }).returning();

    await (app as any).audit({
      userId: request.userId!,
      workspaceId,
      action: 'share',
      resourceType: 'note',
      resourceId: noteId,
    });

    return reply.status(201).send({ data: perm, message: 'Note shared' });
  });

  // Remove note permission
  app.delete('/:workspaceId/notes/:noteId/permissions/:permId', {
    preHandler: [(app as any).resolveWorkspaceRole, (app as any).requireRole('editor')],
  }, async (request, reply) => {
    const { permId } = request.params as { permId: string };
    await db.delete(schema.notePermissions).where(eq(schema.notePermissions.id, permId));
    return reply.status(204).send();
  });
}
