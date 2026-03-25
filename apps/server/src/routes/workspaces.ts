import type { FastifyInstance } from 'fastify';
import { eq, and, count } from 'drizzle-orm';
import { db, schema } from '@threatpad/db';
import { createWorkspaceSchema } from '@threatpad/shared';

export async function workspaceRoutes(app: FastifyInstance) {
  // All routes require auth
  app.addHook('preHandler', (app as any).verifyJwt);

  // List user's workspaces
  app.get('/', async (request) => {
    const memberships = await db.query.workspaceMembers.findMany({
      where: eq(schema.workspaceMembers.userId, request.userId!),
      with: { },
    });

    const workspaces = await Promise.all(
      memberships.map(async (m) => {
        const workspace = await db.query.workspaces.findFirst({
          where: eq(schema.workspaces.id, m.workspaceId),
        });
        const [memberCount] = await db
          .select({ count: count() })
          .from(schema.workspaceMembers)
          .where(eq(schema.workspaceMembers.workspaceId, m.workspaceId));

        return {
          ...workspace,
          role: m.role,
          memberCount: memberCount?.count || 0,
        };
      }),
    );

    return { data: workspaces };
  });

  // Create workspace
  app.post('/', async (request, reply) => {
    const body = createWorkspaceSchema.parse(request.body);

    const [workspace] = await db.insert(schema.workspaces).values({
      name: body.name,
      description: body.description,
      ownerId: request.userId!,
    }).returning();

    await db.insert(schema.workspaceMembers).values({
      workspaceId: workspace!.id,
      userId: request.userId!,
      role: 'owner',
    });

    // Seed default tags
    const { DEFAULT_TAGS } = await import('@threatpad/shared');
    for (const tag of DEFAULT_TAGS) {
      await db.insert(schema.tags).values({
        workspaceId: workspace!.id,
        name: tag.name,
        color: tag.color,
        isSystem: true,
      });
    }

    await (app as any).audit({
      userId: request.userId!,
      workspaceId: workspace!.id,
      action: 'create',
      resourceType: 'workspace',
      resourceId: workspace!.id,
      ipAddress: request.ip,
    });

    return reply.status(201).send({ data: workspace });
  });

  // Get workspace
  app.get('/:workspaceId', {
    preHandler: [(app as any).resolveWorkspaceRole],
  }, async (request) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const workspace = await db.query.workspaces.findFirst({
      where: eq(schema.workspaces.id, workspaceId),
    });
    return { data: workspace };
  });

  // Update workspace
  app.patch('/:workspaceId', {
    preHandler: [(app as any).resolveWorkspaceRole, (app as any).requireRole('owner')],
  }, async (request) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const body = createWorkspaceSchema.partial().parse(request.body);

    const [updated] = await db.update(schema.workspaces)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(schema.workspaces.id, workspaceId))
      .returning();

    return { data: updated };
  });

  // Delete workspace
  app.delete('/:workspaceId', {
    preHandler: [(app as any).resolveWorkspaceRole, (app as any).requireRole('owner')],
  }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };

    // Don't allow deleting personal workspace
    const workspace = await db.query.workspaces.findFirst({
      where: eq(schema.workspaces.id, workspaceId),
    });
    if (workspace?.isPersonal) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Cannot delete personal workspace' });
    }

    await db.delete(schema.workspaces).where(eq(schema.workspaces.id, workspaceId));

    return reply.status(204).send();
  });

  // List members
  app.get('/:workspaceId/members', {
    preHandler: [(app as any).resolveWorkspaceRole],
  }, async (request) => {
    const { workspaceId } = request.params as { workspaceId: string };

    const members = await db.query.workspaceMembers.findMany({
      where: eq(schema.workspaceMembers.workspaceId, workspaceId),
    });

    const enriched = await Promise.all(
      members.map(async (m) => {
        const user = await db.query.users.findFirst({
          where: eq(schema.users.id, m.userId),
        });
        return {
          ...m,
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

  // Invite member
  app.post('/:workspaceId/invite', {
    preHandler: [(app as any).resolveWorkspaceRole, (app as any).requireRole('owner')],
  }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const { email, role = 'editor' } = request.body as { email: string; role?: string };

    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (!user) {
      return reply.status(404).send({ error: 'Not Found', message: 'User not found. They must register first.' });
    }

    const existing = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(schema.workspaceMembers.workspaceId, workspaceId),
        eq(schema.workspaceMembers.userId, user.id),
      ),
    });

    if (existing) {
      return reply.status(409).send({ error: 'Conflict', message: 'User is already a member' });
    }

    await db.insert(schema.workspaceMembers).values({
      workspaceId,
      userId: user.id,
      role: role as 'owner' | 'editor' | 'viewer',
    });

    return reply.status(201).send({ message: 'Member added' });
  });

  // Change member role
  app.patch('/:workspaceId/members/:userId', {
    preHandler: [(app as any).resolveWorkspaceRole, (app as any).requireRole('owner')],
  }, async (request) => {
    const { workspaceId, userId } = request.params as { workspaceId: string; userId: string };
    const { role } = request.body as { role: string };

    await db.update(schema.workspaceMembers)
      .set({ role: role as 'owner' | 'editor' | 'viewer' })
      .where(and(
        eq(schema.workspaceMembers.workspaceId, workspaceId),
        eq(schema.workspaceMembers.userId, userId),
      ));

    return { message: 'Role updated' };
  });

  // Remove member
  app.delete('/:workspaceId/members/:userId', {
    preHandler: [(app as any).resolveWorkspaceRole, (app as any).requireRole('owner')],
  }, async (request, reply) => {
    const { workspaceId, userId } = request.params as { workspaceId: string; userId: string };

    await db.delete(schema.workspaceMembers)
      .where(and(
        eq(schema.workspaceMembers.workspaceId, workspaceId),
        eq(schema.workspaceMembers.userId, userId),
      ));

    return reply.status(204).send();
  });
}
