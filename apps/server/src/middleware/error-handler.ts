import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  request.log.error(error);

  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
      statusCode: 400,
    });
  }

  const statusCode = error.statusCode || 500;
  return reply.status(statusCode).send({
    error: statusCode >= 500 ? 'Internal Server Error' : error.message,
    message: statusCode >= 500 ? 'An unexpected error occurred' : error.message,
    statusCode,
  });
}
