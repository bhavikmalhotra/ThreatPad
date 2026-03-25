import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '@threatpad/db';
import type { WorkspaceRole } from '@threatpad/shared';
import { hasPermission } from '@threatpad/shared';

declare module 'fastify' {
  interface FastifyRequest {
    workspaceRole?: WorkspaceRole;
  }
}

async function rbacPlugin(fastify: FastifyInstance) {
  // Decorator that resolves the user's role in the workspace from params
  fastify.decorate('resolveWorkspaceRole', async (request: FastifyRequest, reply: FastifyReply) => {
    const workspaceId = (request.params as Record<string, string>).workspaceId;
    const userId = request.userId;

    if (!workspaceId || !userId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Missing workspace or user context' });
    }

    const member = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(schema.workspaceMembers.workspaceId, workspaceId),
        eq(schema.workspaceMembers.userId, userId),
      ),
    });

    if (!member) {
      return reply.status(403).send({ error: 'Forbidden', message: 'You are not a member of this workspace' });
    }

    request.workspaceRole = member.role as WorkspaceRole;
  });

  // Factory for role-check preHandlers
  fastify.decorate('requireRole', (requiredRole: WorkspaceRole) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.workspaceRole) {
        return reply.status(403).send({ error: 'Forbidden', message: 'No workspace role resolved' });
      }
      if (!hasPermission(request.workspaceRole, requiredRole)) {
        return reply.status(403).send({ error: 'Forbidden', message: `Requires ${requiredRole} role or higher` });
      }
    };
  });
}

export default fp(rbacPlugin, { name: 'rbac', dependencies: ['auth'] });
