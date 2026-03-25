import type { FastifyInstance } from 'fastify';
import { eq, or, isNull } from 'drizzle-orm';
import { db, schema } from '@threatpad/db';

export async function templateRoutes(app: FastifyInstance) {
  app.addHook('preHandler', (app as any).verifyJwt);

  // List templates (system + workspace-specific)
  app.get('/:workspaceId/templates', {
    preHandler: [(app as any).resolveWorkspaceRole],
  }, async (request) => {
    const { workspaceId } = request.params as { workspaceId: string };

    const templates = await db.query.noteTemplates.findMany({
      where: or(
        eq(schema.noteTemplates.workspaceId, workspaceId),
        isNull(schema.noteTemplates.workspaceId), // system templates
      ),
      orderBy: (t, { asc }) => [asc(t.name)],
    });

    return { data: templates };
  });

  // Create template
  app.post('/:workspaceId/templates', {
    preHandler: [(app as any).resolveWorkspaceRole, (app as any).requireRole('editor')],
  }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const { name, description, category, contentMd } = request.body as {
      name: string;
      description?: string;
      category?: string;
      contentMd: string;
    };

    const [template] = await db.insert(schema.noteTemplates).values({
      workspaceId,
      name,
      description,
      category: (category || 'custom') as any,
      contentMd,
      createdBy: request.userId!,
    }).returning();

    return reply.status(201).send({ data: template });
  });

  // Get template
  app.get('/:workspaceId/templates/:templateId', async (request, reply) => {
    const { templateId } = request.params as { templateId: string };

    const template = await db.query.noteTemplates.findFirst({
      where: eq(schema.noteTemplates.id, templateId),
    });

    if (!template) {
      return reply.status(404).send({ error: 'Not Found' });
    }

    return { data: template };
  });

  // Delete template
  app.delete('/:workspaceId/templates/:templateId', {
    preHandler: [(app as any).resolveWorkspaceRole, (app as any).requireRole('owner')],
  }, async (request, reply) => {
    const { templateId } = request.params as { templateId: string };

    const template = await db.query.noteTemplates.findFirst({
      where: eq(schema.noteTemplates.id, templateId),
    });

    if (template?.isSystem) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Cannot delete system templates' });
    }

    await db.delete(schema.noteTemplates).where(eq(schema.noteTemplates.id, templateId));
    return reply.status(204).send();
  });
}
