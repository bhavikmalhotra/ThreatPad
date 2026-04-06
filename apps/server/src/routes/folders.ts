import type { FastifyInstance } from 'fastify';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { db, schema } from '@threatpad/db';
import { createFolderSchema } from '@threatpad/shared';

export async function folderRoutes(app: FastifyInstance) {
  app.addHook('preHandler', (app as any).verifyJwt);

  // List folders (tree)
  app.get('/:workspaceId/folders', {
    preHandler: [(app as any).resolveWorkspaceRole],
  }, async (request) => {
    const { workspaceId } = request.params as { workspaceId: string };

    const allFolders = await db.query.folders.findMany({
      where: and(
        eq(schema.folders.workspaceId, workspaceId),
        isNull(schema.folders.deletedAt),
      ),
      orderBy: (f, { asc }) => [asc(f.position)],
    });

    // Count notes per folder
    const noteCounts = await db
      .select({
        folderId: schema.notes.folderId,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.notes)
      .where(and(
        eq(schema.notes.workspaceId, workspaceId),
        isNull(schema.notes.deletedAt),
      ))
      .groupBy(schema.notes.folderId);

    const noteCountMap = new Map(noteCounts.map((n) => [n.folderId, n.count]));

    // Fetch notes that belong to folders in this workspace
    const folderNotes = await db.query.notes.findMany({
      where: and(
        eq(schema.notes.workspaceId, workspaceId),
        isNull(schema.notes.deletedAt),
      ),
      columns: { id: true, title: true, type: true, folderId: true, updatedAt: true },
    });

    // Group notes by folderId
    const notesByFolder = new Map<string, typeof folderNotes>();
    for (const n of folderNotes) {
      if (!n.folderId) continue;
      if (!notesByFolder.has(n.folderId)) notesByFolder.set(n.folderId, []);
      notesByFolder.get(n.folderId)!.push(n);
    }

    // Build tree
    type FolderNode = typeof allFolders[number] & { children: FolderNode[]; noteCount: number; notes: typeof folderNotes };
    const folderMap = new Map<string, FolderNode>();
    const roots: FolderNode[] = [];

    for (const f of allFolders) {
      folderMap.set(f.id, { ...f, children: [], noteCount: noteCountMap.get(f.id) || 0, notes: notesByFolder.get(f.id) || [] });
    }

    for (const f of folderMap.values()) {
      if (f.parentId && folderMap.has(f.parentId)) {
        folderMap.get(f.parentId)!.children.push(f);
      } else {
        roots.push(f);
      }
    }

    return { data: roots };
  });

  // Create folder
  app.post('/:workspaceId/folders', {
    preHandler: [(app as any).resolveWorkspaceRole, (app as any).requireRole('editor')],
  }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const body = createFolderSchema.parse(request.body);

    let depth = 0;
    if (body.parentId) {
      const parent = await db.query.folders.findFirst({
        where: eq(schema.folders.id, body.parentId),
      });
      if (!parent) {
        return reply.status(404).send({ error: 'Not Found', message: 'Parent folder not found' });
      }
      depth = parent.depth + 1;
      if (depth > 5) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Maximum folder depth is 5' });
      }
    }

    const [folder] = await db.insert(schema.folders).values({
      workspaceId,
      parentId: body.parentId,
      name: body.name,
      depth,
      createdBy: request.userId!,
    }).returning();

    await (app as any).audit({
      userId: request.userId!,
      workspaceId,
      action: 'create',
      resourceType: 'folder',
      resourceId: folder!.id,
    });

    return reply.status(201).send({ data: folder });
  });

  // Rename/move folder
  app.patch('/:workspaceId/folders/:folderId', {
    preHandler: [(app as any).resolveWorkspaceRole, (app as any).requireRole('editor')],
  }, async (request) => {
    const { folderId } = request.params as { folderId: string };
    const { name, parentId } = request.body as { name?: string; parentId?: string };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name) updates.name = name;
    if (parentId !== undefined) updates.parentId = parentId;

    const [updated] = await db.update(schema.folders)
      .set(updates)
      .where(eq(schema.folders.id, folderId))
      .returning();

    return { data: updated };
  });

  // Delete folder (soft delete)
  app.delete('/:workspaceId/folders/:folderId', {
    preHandler: [(app as any).resolveWorkspaceRole, (app as any).requireRole('owner')],
  }, async (request, reply) => {
    const { folderId } = request.params as { folderId: string };

    await db.update(schema.folders)
      .set({ deletedAt: new Date() })
      .where(eq(schema.folders.id, folderId));

    return reply.status(204).send();
  });
}
