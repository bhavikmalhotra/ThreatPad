import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3002),
  HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/threatpad'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_SECRET: z.string().default('dev-jwt-secret-change-in-production'),
  JWT_REFRESH_SECRET: z.string().default('dev-refresh-secret-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_EXPIRES_IN_DAYS: z.coerce.number().default(7),

  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // OAuth
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GITHUB_CLIENT_ID: z.string().default(''),
  GITHUB_CLIENT_SECRET: z.string().default(''),

  // Email (Resend)
  RESEND_API_KEY: z.string().default(''),
  FROM_EMAIL: z.string().default('noreply@threatpad.io'),

  // App URLs
  APP_URL: z.string().default('http://localhost:3000'),
  API_URL: z.string().default('http://localhost:3002'),

  // Self-hosted mode
  SELF_HOSTED: z.coerce.boolean().default(false),
  DISABLE_REGISTRATION: z.coerce.boolean().default(false),

  // Domain filtering — comma-separated list of allowed email domains (empty = allow all)
  ALLOWED_EMAIL_DOMAINS: z.string().default(''),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
