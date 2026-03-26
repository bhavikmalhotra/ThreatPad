import type { FastifyInstance } from 'fastify';
import { exportRegistry } from '../plugins/exporters/index.js';

export async function exportFormatRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    return { data: exportRegistry.list() };
  });
}
