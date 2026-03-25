import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '@threatpad/db';
import { createTagSchema } from '@threatpad/shared';

export async function tagRoutes(app: FastifyInstance) {
  app.addHook('preHandler', (app as any).verifyJwt);

  // List tags
  app.get('/:workspaceId/tags', {
    preHandler: [(app as any).resolveWorkspaceRole],
  }, async (request) => {
    const { workspaceId } = request.params as { workspaceId: string };

    const tags = await db.query.tags.findMany({
      where: eq(schema.tags.workspaceId, workspaceId),
      orderBy: (t, { asc }) => [asc(t.name)],
    });

    return { data: tags };
  });

  // Create tag
  app.post('/:workspaceId/tags', {
    preHandler: [(app as any).resolveWorkspaceRole, (app as any).requireRole('editor')],
  }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const body = createTagSchema.parse(request.body);

    const [tag] = await db.insert(schema.tags).values({
      workspaceId,
      name: body.name,
      color: body.color,
      createdBy: request.userId!,
    }).returning();

    return reply.status(201).send({ data: tag });
  });

  // Update tag
  app.patch('/:workspaceId/tags/:tagId', {
    preHandler: [(app as any).resolveWorkspaceRole, (app as any).requireRole('editor')],
  }, async (request) => {
    const { tagId } = request.params as { tagId: string };
    const { name, color } = request.body as { name?: string; color?: string };

    const updates: Record<string, unknown> = {};
    if (name) updates.name = name;
    if (color) updates.color = color;

    const [updated] = await db.update(schema.tags)
      .set(updates)
      .where(eq(schema.tags.id, tagId))
      .returning();

    return { data: updated };
  });

  // Delete tag
  app.delete('/:workspaceId/tags/:tagId', {
    preHandler: [(app as any).resolveWorkspaceRole, (app as any).requireRole('editor')],
  }, async (request, reply) => {
    const { tagId } = request.params as { tagId: string };
    await db.delete(schema.tags).where(eq(schema.tags.id, tagId));
    return reply.status(204).send();
  });

  // Add tags to a note
  app.post('/:workspaceId/notes/:noteId/tags', {
    preHandler: [(app as any).resolveWorkspaceRole, (app as any).requireRole('editor')],
  }, async (request, reply) => {
    const { noteId } = request.params as { noteId: string };
    const { tagIds } = request.body as { tagIds: string[] };

    await db.insert(schema.noteTags)
      .values(tagIds.map((tagId) => ({ noteId, tagId })))
      .onConflictDoNothing();

    return reply.status(201).send({ message: 'Tags added' });
  });

  // Remove tag from note
  app.delete('/:workspaceId/notes/:noteId/tags/:tagId', {
    preHandler: [(app as any).resolveWorkspaceRole, (app as any).requireRole('editor')],
  }, async (request, reply) => {
    const { noteId, tagId } = request.params as { noteId: string; tagId: string };
    await db.delete(schema.noteTags).where(
      and(eq(schema.noteTags.noteId, noteId), eq(schema.noteTags.tagId, tagId)),
    );
    return reply.status(204).send();
  });
}
