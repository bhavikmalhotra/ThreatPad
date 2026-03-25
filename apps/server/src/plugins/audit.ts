import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { db, schema } from '@threatpad/db';
import type { AuditAction } from '@threatpad/shared';

export interface AuditEntry {
  userId: string;
  workspaceId?: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

async function auditPlugin(fastify: FastifyInstance) {
  fastify.decorate('audit', async (entry: AuditEntry) => {
    try {
      await db.insert(schema.auditLogs).values({
        userId: entry.userId,
        workspaceId: entry.workspaceId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        metadata: entry.metadata || {},
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      });
    } catch (err) {
      fastify.log.error({ err }, 'Failed to write audit log');
    }
  });
}

export default fp(auditPlugin, { name: 'audit' });
