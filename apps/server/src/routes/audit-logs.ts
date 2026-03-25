import type { FastifyInstance } from 'fastify';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db, schema } from '@threatpad/db';

export async function auditLogRoutes(app: FastifyInstance) {
  app.addHook('preHandler', (app as any).verifyJwt);

  // List audit logs for workspace
  app.get('/:workspaceId/audit-logs', {
    preHandler: [(app as any).resolveWorkspaceRole, (app as any).requireRole('editor')],
  }, async (request) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const { action, userId, resourceType, page = '1', limit = '50' } = request.query as Record<string, string>;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [eq(schema.auditLogs.workspaceId, workspaceId)];

    if (action) {
      conditions.push(eq(schema.auditLogs.action, action as any));
    }
    if (userId) {
      conditions.push(eq(schema.auditLogs.userId, userId));
    }
    if (resourceType) {
      conditions.push(eq(schema.auditLogs.resourceType, resourceType));
    }

    const logs = await db.query.auditLogs.findMany({
      where: and(...conditions),
      orderBy: [desc(schema.auditLogs.createdAt)],
      limit: limitNum,
      offset,
    });

    // Enrich with user info
    const enriched = await Promise.all(
      logs.map(async (log) => {
        let user = null;
        if (log.userId) {
          const u = await db.query.users.findFirst({
            where: eq(schema.users.id, log.userId),
          });
          if (u) {
            user = { id: u.id, email: u.email, displayName: u.displayName, avatarColor: u.avatarColor };
          }
        }
        return { ...log, user };
      }),
    );

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.auditLogs)
      .where(and(...conditions));

    return {
      data: enriched,
      page: pageNum,
      limit: limitNum,
      total: countResult?.count || 0,
    };
  });
}
