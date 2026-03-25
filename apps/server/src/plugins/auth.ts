import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import * as jose from 'jose';
import { env } from '../config/env.js';

export interface JwtPayload {
  sub: string;
  email: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    userEmail?: string;
  }
}

async function authPlugin(fastify: FastifyInstance) {
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  // Expose a verifyToken method for WebSocket auth
  fastify.decorate('verifyToken', async (token: string) => {
    return jose.jwtVerify(token, secret);
  });

  fastify.decorate('verifyJwt', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Missing or invalid token' });
    }

    const token = authHeader.slice(7);
    try {
      const { payload } = await jose.jwtVerify(token, secret);
      request.userId = payload.sub as string;
      request.userEmail = (payload as unknown as JwtPayload).email;
    } catch {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
    }
  });
}

export default fp(authPlugin, { name: 'auth' });

// Utility to generate tokens
export async function generateAccessToken(userId: string, email: string): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  return new jose.SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secret);
}

export async function generateRefreshToken(userId: string): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);
  return new jose.SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${env.REFRESH_EXPIRES_IN_DAYS}d`)
    .sign(secret);
}

export async function verifyRefreshToken(token: string): Promise<string | null> {
  const secret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);
  try {
    const { payload } = await jose.jwtVerify(token, secret);
    return payload.sub as string;
  } catch {
    return null;
  }
}
