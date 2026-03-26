import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import Redis from 'ioredis';
import { db } from '@threatpad/db';
import { sql } from 'drizzle-orm';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import authPlugin from './plugins/auth.js';
import rbacPlugin from './plugins/rbac.js';
import auditPlugin from './plugins/audit.js';
import { authRoutes } from './routes/auth.js';
import { workspaceRoutes } from './routes/workspaces.js';
import { folderRoutes } from './routes/folders.js';
import { noteRoutes } from './routes/notes.js';
import { tagRoutes } from './routes/tags.js';
import { templateRoutes } from './routes/templates.js';
import { searchRoutes } from './routes/search.js';
import { iocRoutes } from './routes/iocs.js';
import { versionRoutes } from './routes/versions.js';
import { auditLogRoutes } from './routes/audit-logs.js';
import { exportFormatRoutes } from './routes/export-formats.js';
import { registerYjsWebSocket } from './ws/yjs-server.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport: env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  });

  // Error handler
  app.setErrorHandler(errorHandler);

  // Plugins
  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(cookie);

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await app.register(websocket);
  await app.register(authPlugin);
  await app.register(rbacPlugin);
  await app.register(auditPlugin);

  // Health check — tests DB and Redis connectivity
  app.get('/api/health', async (_request, reply) => {
    const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

    // Check Postgres
    const dbStart = Date.now();
    try {
      await db.execute(sql`SELECT 1`);
      checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
    } catch (err) {
      checks.database = { status: 'error', latencyMs: Date.now() - dbStart, error: (err as Error).message };
    }

    // Check Redis
    const redisStart = Date.now();
    try {
      const redis = new Redis(env.REDIS_URL, { lazyConnect: true, connectTimeout: 3000 });
      await redis.connect();
      await redis.ping();
      checks.redis = { status: 'ok', latencyMs: Date.now() - redisStart };
      await redis.quit();
    } catch (err) {
      checks.redis = { status: 'error', latencyMs: Date.now() - redisStart, error: (err as Error).message };
    }

    const allHealthy = Object.values(checks).every((c) => c.status === 'ok');
    const status = allHealthy ? 'ok' : 'degraded';

    return reply.status(allHealthy ? 200 : 503).send({
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor(process.uptime()),
      checks,
    });
  });

  // Routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(workspaceRoutes, { prefix: '/api/workspaces' });
  await app.register(folderRoutes, { prefix: '/api/workspaces' });
  await app.register(noteRoutes, { prefix: '/api/workspaces' });
  await app.register(tagRoutes, { prefix: '/api/workspaces' });
  await app.register(templateRoutes, { prefix: '/api/workspaces' });
  await app.register(searchRoutes, { prefix: '/api/workspaces' });
  await app.register(iocRoutes, { prefix: '/api/notes' });
  await app.register(versionRoutes, { prefix: '/api/notes' });
  await app.register(auditLogRoutes, { prefix: '/api/workspaces' });
  await app.register(exportFormatRoutes, { prefix: '/api/export-formats' });

  // WebSocket (Yjs real-time collaboration)
  registerYjsWebSocket(app);

  return app;
}
