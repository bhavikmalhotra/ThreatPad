import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '@threatpad/db';
import { loginSchema, registerSchema } from '@threatpad/shared';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../plugins/auth.js';
import { env } from '../config/env.js';
import { sendEmail, verificationEmail, passwordResetEmail } from '../services/email.js';

// ── Helper: issue tokens + set cookie ──
async function issueTokens(
  app: FastifyInstance,
  reply: any,
  user: { id: string; email: string },
  request: any,
) {
  const accessToken = await generateAccessToken(user.id, user.email);
  const refreshToken = await generateRefreshToken(user.id);

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + env.REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(schema.refreshTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, user.id));

  reply.setCookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: env.REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60,
  });

  await (app as any).audit({
    userId: user.id,
    action: 'login',
    resourceType: 'user',
    resourceId: user.id,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
  });

  return { accessToken, expiresIn: 900 };
}

// ── Helper: create or find OAuth user ──
async function findOrCreateOAuthUser(
  provider: string,
  profile: { id: string; email: string; name: string },
) {
  // Check if OAuth account already linked
  const existing = await db.query.users.findFirst({
    where: and(
      eq(schema.users.oauthProvider, provider),
      eq(schema.users.oauthId, profile.id),
    ),
  });
  if (existing) return existing;

  // Check if email already registered (link accounts)
  const byEmail = await db.query.users.findFirst({
    where: eq(schema.users.email, profile.email),
  });
  if (byEmail) {
    await db.update(schema.users)
      .set({ oauthProvider: provider, oauthId: profile.id })
      .where(eq(schema.users.id, byEmail.id));
    return byEmail;
  }

  // Create new user
  const avatarColors = ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#22c55e', '#14b8a6', '#3b82f6'];
  const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)]!;

  const [user] = await db.insert(schema.users).values({
    email: profile.email,
    displayName: profile.name || profile.email.split('@')[0]!,
    avatarColor,
    oauthProvider: provider,
    oauthId: profile.id,
    emailVerified: true, // OAuth emails are pre-verified
  }).returning();

  // Create personal workspace
  const [workspace] = await db.insert(schema.workspaces).values({
    name: 'Personal',
    isPersonal: true,
    ownerId: user!.id,
  }).returning();

  await db.insert(schema.workspaceMembers).values({
    workspaceId: workspace!.id,
    userId: user!.id,
    role: 'owner',
  });

  return user!;
}

// ── Helper: generate a secure random token ──
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ── Helper: check if email domain is allowed ──
function isEmailDomainAllowed(email: string): boolean {
  if (!env.ALLOWED_EMAIL_DOMAINS) return true;
  const allowedDomains = env.ALLOWED_EMAIL_DOMAINS.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
  if (allowedDomains.length === 0) return true;
  const emailDomain = email.split('@')[1]?.toLowerCase();
  return !!emailDomain && allowedDomains.includes(emailDomain);
}

export async function authRoutes(app: FastifyInstance) {
  // ═══════════════════════════════════════
  // Setup (first user / admin)
  // ═══════════════════════════════════════
  app.post('/setup', async (request, reply) => {
    // Only works when no users exist in the database
    const existingUsers = await db.query.users.findFirst();
    if (existingUsers) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Setup already completed' });
    }

    const body = registerSchema.parse(request.body);

    const passwordHash = await bcrypt.hash(body.password, 12);
    const [user] = await db.insert(schema.users).values({
      email: body.email,
      passwordHash,
      displayName: body.displayName,
      avatarColor: '#6366f1',
      emailVerified: true, // Skip verification for setup user
    }).returning();

    // Create personal workspace
    const [workspace] = await db.insert(schema.workspaces).values({
      name: 'Personal',
      isPersonal: true,
      ownerId: user!.id,
    }).returning();

    await db.insert(schema.workspaceMembers).values({
      workspaceId: workspace!.id,
      userId: user!.id,
      role: 'owner',
    });

    // Auto-login the setup user
    const tokens = await issueTokens(app, reply, user!, request);

    return reply.status(201).send({
      message: 'Setup complete. You are now logged in.',
      user: { id: user!.id, email: user!.email, displayName: user!.displayName },
      ...tokens,
    });
  });

  // ═══════════════════════════════════════
  // Config (public — tells frontend about self-hosted settings)
  // ═══════════════════════════════════════
  app.get('/config', async () => {
    const hasUsers = !!(await db.query.users.findFirst());
    return {
      selfHosted: env.SELF_HOSTED,
      registrationDisabled: env.DISABLE_REGISTRATION,
      setupRequired: !hasUsers,
      allowedEmailDomains: env.ALLOWED_EMAIL_DOMAINS
        ? env.ALLOWED_EMAIL_DOMAINS.split(',').map(d => d.trim().toLowerCase()).filter(Boolean)
        : [],
    };
  });

  // ═══════════════════════════════════════
  // Register
  // ═══════════════════════════════════════
  app.post('/register', async (request, reply) => {
    // Block registration if disabled
    if (env.DISABLE_REGISTRATION) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Public registration is disabled. Contact your admin for an invite.' });
    }

    const body = registerSchema.parse(request.body);

    if (!isEmailDomainAllowed(body.email)) {
      const domains = env.ALLOWED_EMAIL_DOMAINS;
      return reply.status(403).send({ error: 'Forbidden', message: `Registration is restricted to these email domains: ${domains}` });
    }

    const existing = await db.query.users.findFirst({
      where: eq(schema.users.email, body.email),
    });
    if (existing) {
      return reply.status(409).send({ error: 'Conflict', message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const avatarColors = ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#22c55e', '#14b8a6', '#3b82f6'];
    const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)]!;

    const [user] = await db.insert(schema.users).values({
      email: body.email,
      passwordHash,
      displayName: body.displayName,
      avatarColor,
      emailVerified: env.SELF_HOSTED, // Auto-verify in self-hosted mode
    }).returning();

    // Create personal workspace
    const [workspace] = await db.insert(schema.workspaces).values({
      name: 'Personal',
      isPersonal: true,
      ownerId: user!.id,
    }).returning();

    await db.insert(schema.workspaceMembers).values({
      workspaceId: workspace!.id,
      userId: user!.id,
      role: 'owner',
    });

    // Send verification email (skip in self-hosted mode)
    if (!env.SELF_HOSTED) {
      const token = generateToken();
      await db.insert(schema.verificationTokens).values({
        userId: user!.id,
        tokenHash: hashToken(token),
        type: 'email_verify',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      await sendEmail(verificationEmail(body.email, token));
    }

    await (app as any).audit({
      userId: user!.id,
      action: 'create',
      resourceType: 'user',
      resourceId: user!.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return reply.status(201).send({
      message: 'Account created. Please check your email to verify your account.',
      user: { id: user!.id, email: user!.email, displayName: user!.displayName },
    });
  });

  // ═══════════════════════════════════════
  // Verify Email
  // ═══════════════════════════════════════
  app.get('/verify-email/:token', async (request, reply) => {
    const { token } = request.params as { token: string };
    const tokenHash = hashToken(token);

    const stored = await db.query.verificationTokens.findFirst({
      where: and(
        eq(schema.verificationTokens.tokenHash, tokenHash),
        eq(schema.verificationTokens.type, 'email_verify'),
      ),
    });

    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid or expired verification link' });
    }

    // Mark token as used
    await db.update(schema.verificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(schema.verificationTokens.id, stored.id));

    // Mark user as verified
    await db.update(schema.users)
      .set({ emailVerified: true })
      .where(eq(schema.users.id, stored.userId));

    return { message: 'Email verified successfully. You can now log in.' };
  });

  // ═══════════════════════════════════════
  // Login
  // ═══════════════════════════════════════
  app.post('/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '15 minutes',
      },
    },
  }, async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, body.email),
    });

    if (!user || !user.passwordHash) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid email or password' });
    }

    if (!user.emailVerified) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Please verify your email before logging in' });
    }

    const tokens = await issueTokens(app, reply, user, request);

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarColor: user.avatarColor,
      },
      ...tokens,
    };
  });

  // ═══════════════════════════════════════
  // Forgot Password
  // ═══════════════════════════════════════
  app.post('/forgot-password', async (request, reply) => {
    const { email } = request.body as { email: string };

    // Always return success to prevent email enumeration
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (user) {
      const token = generateToken();
      await db.insert(schema.verificationTokens).values({
        userId: user.id,
        tokenHash: hashToken(token),
        type: 'password_reset',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      });

      await sendEmail(passwordResetEmail(email, token));
    }

    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  });

  // ═══════════════════════════════════════
  // Reset Password
  // ═══════════════════════════════════════
  app.post('/reset-password', async (request, reply) => {
    const { token, password } = request.body as { token: string; password: string };

    if (!password || password.length < 8) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Password must be at least 8 characters' });
    }

    const tokenHash = hashToken(token);
    const stored = await db.query.verificationTokens.findFirst({
      where: and(
        eq(schema.verificationTokens.tokenHash, tokenHash),
        eq(schema.verificationTokens.type, 'password_reset'),
      ),
    });

    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid or expired reset link' });
    }

    // Mark token as used
    await db.update(schema.verificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(schema.verificationTokens.id, stored.id));

    // Update password
    const passwordHash = await bcrypt.hash(password, 12);
    await db.update(schema.users)
      .set({ passwordHash, emailVerified: true })
      .where(eq(schema.users.id, stored.userId));

    return { message: 'Password reset successfully. You can now log in.' };
  });

  // ═══════════════════════════════════════
  // Google OAuth
  // ═══════════════════════════════════════
  app.get('/oauth/google', async (request, reply) => {
    if (!env.GOOGLE_CLIENT_ID) {
      return reply.status(501).send({ error: 'Not Implemented', message: 'Google OAuth is not configured' });
    }

    const state = generateToken();
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: `${env.API_URL}/api/auth/oauth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    // Store state in cookie for CSRF protection
    reply.setCookie('oauth_state', state, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth/oauth',
      maxAge: 600, // 10 minutes
    });

    return reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });

  app.get('/oauth/google/callback', async (request, reply) => {
    const { code, state } = request.query as { code: string; state: string };
    const storedState = (request.cookies as Record<string, string>)?.oauth_state;

    if (!state || state !== storedState) {
      return reply.redirect(`${env.APP_URL}/login?error=oauth_state_mismatch`);
    }

    reply.clearCookie('oauth_state', { path: '/api/auth/oauth' });

    try {
      // Exchange code for tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: `${env.API_URL}/api/auth/oauth/google/callback`,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenRes.ok) {
        return reply.redirect(`${env.APP_URL}/login?error=oauth_token_exchange_failed`);
      }

      const tokenData = await tokenRes.json() as { access_token: string };

      // Fetch user profile
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!profileRes.ok) {
        return reply.redirect(`${env.APP_URL}/login?error=oauth_profile_failed`);
      }

      const profile = await profileRes.json() as { id: string; email: string; name: string };

      if (!isEmailDomainAllowed(profile.email)) {
        return reply.redirect(`${env.APP_URL}/login?error=oauth_domain_not_allowed`);
      }

      const user = await findOrCreateOAuthUser('google', profile);
      const tokens = await issueTokens(app, reply, user, request);

      // Redirect to frontend with access token
      return reply.redirect(`${env.APP_URL}/oauth/callback?accessToken=${tokens.accessToken}&expiresIn=${tokens.expiresIn}`);
    } catch {
      return reply.redirect(`${env.APP_URL}/login?error=oauth_failed`);
    }
  });

  // ═══════════════════════════════════════
  // GitHub OAuth
  // ═══════════════════════════════════════
  app.get('/oauth/github', async (request, reply) => {
    if (!env.GITHUB_CLIENT_ID) {
      return reply.status(501).send({ error: 'Not Implemented', message: 'GitHub OAuth is not configured' });
    }

    const state = generateToken();
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: `${env.API_URL}/api/auth/oauth/github/callback`,
      scope: 'read:user user:email',
      state,
    });

    reply.setCookie('oauth_state', state, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth/oauth',
      maxAge: 600,
    });

    return reply.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
  });

  app.get('/oauth/github/callback', async (request, reply) => {
    const { code, state } = request.query as { code: string; state: string };
    const storedState = (request.cookies as Record<string, string>)?.oauth_state;

    if (!state || state !== storedState) {
      return reply.redirect(`${env.APP_URL}/login?error=oauth_state_mismatch`);
    }

    reply.clearCookie('oauth_state', { path: '/api/auth/oauth' });

    try {
      // Exchange code for access token
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: `${env.API_URL}/api/auth/oauth/github/callback`,
        }),
      });

      const tokenData = await tokenRes.json() as { access_token: string; error?: string };
      if (tokenData.error || !tokenData.access_token) {
        return reply.redirect(`${env.APP_URL}/login?error=oauth_token_exchange_failed`);
      }

      // Fetch user profile
      const profileRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'User-Agent': 'ThreatPad',
        },
      });

      const profile = await profileRes.json() as { id: number; login: string; name: string; email: string | null };

      // GitHub may not return email in profile — fetch from emails API
      let email = profile.email;
      if (!email) {
        const emailRes = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            'User-Agent': 'ThreatPad',
          },
        });
        const emails = await emailRes.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
        const primary = emails.find((e) => e.primary && e.verified);
        email = primary?.email || emails[0]?.email || null;
      }

      if (!email) {
        return reply.redirect(`${env.APP_URL}/login?error=oauth_no_email`);
      }

      if (!isEmailDomainAllowed(email)) {
        return reply.redirect(`${env.APP_URL}/login?error=oauth_domain_not_allowed`);
      }

      const user = await findOrCreateOAuthUser('github', {
        id: String(profile.id),
        email,
        name: profile.name || profile.login,
      });

      const tokens = await issueTokens(app, reply, user, request);
      return reply.redirect(`${env.APP_URL}/oauth/callback?accessToken=${tokens.accessToken}&expiresIn=${tokens.expiresIn}`);
    } catch {
      return reply.redirect(`${env.APP_URL}/login?error=oauth_failed`);
    }
  });

  // ═══════════════════════════════════════
  // Resend Verification Email
  // ═══════════════════════════════════════
  app.post('/resend-verification', async (request, reply) => {
    const { email } = request.body as { email: string };

    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (!user || user.emailVerified) {
      // Don't reveal whether user exists
      return { message: 'If that email needs verification, a new link has been sent.' };
    }

    const token = generateToken();
    await db.insert(schema.verificationTokens).values({
      userId: user.id,
      tokenHash: hashToken(token),
      type: 'email_verify',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await sendEmail(verificationEmail(email, token));

    return { message: 'If that email needs verification, a new link has been sent.' };
  });

  // ═══════════════════════════════════════
  // Refresh Token
  // ═══════════════════════════════════════
  app.post('/refresh', async (request, reply) => {
    const token = (request.cookies as Record<string, string>)?.refreshToken;
    if (!token) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'No refresh token' });
    }

    const userId = await verifyRefreshToken(token);
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid refresh token' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const stored = await db.query.refreshTokens.findFirst({
      where: eq(schema.refreshTokens.tokenHash, tokenHash),
    });

    if (!stored || stored.revokedAt) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Token revoked' });
    }

    // Revoke old token
    await db.update(schema.refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(schema.refreshTokens.id, stored.id));

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'User not found' });
    }

    // Issue new tokens (rotation)
    const newAccessToken = await generateAccessToken(user.id, user.email);
    const newRefreshToken = await generateRefreshToken(user.id);
    const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + env.REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);

    await db.insert(schema.refreshTokens).values({
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt,
    });

    reply.setCookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: env.REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60,
    });

    return { accessToken: newAccessToken, expiresIn: 900 };
  });

  // ═══════════════════════════════════════
  // Logout
  // ═══════════════════════════════════════
  app.post('/logout', {
    preHandler: [(app as any).verifyJwt],
  }, async (request, reply) => {
    const token = (request.cookies as Record<string, string>)?.refreshToken;
    if (token) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await db.update(schema.refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(schema.refreshTokens.tokenHash, tokenHash));
    }

    reply.clearCookie('refreshToken', { path: '/api/auth' });

    await (app as any).audit({
      userId: request.userId,
      action: 'logout',
      resourceType: 'user',
      resourceId: request.userId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return { message: 'Logged out' };
  });

  // ═══════════════════════════════════════
  // Get Current User
  // ═══════════════════════════════════════
  app.get('/me', {
    preHandler: [(app as any).verifyJwt],
  }, async (request, reply) => {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, request.userId!),
    });

    if (!user) {
      return reply.status(404).send({ error: 'Not Found', message: 'User not found' });
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarColor: user.avatarColor,
      emailVerified: user.emailVerified,
      oauthProvider: user.oauthProvider,
      createdAt: user.createdAt,
    };
  });

  // ═══════════════════════════════════════
  // Update Profile
  // ═══════════════════════════════════════
  app.patch('/me', {
    preHandler: [(app as any).verifyJwt],
  }, async (request, reply) => {
    const { displayName } = request.body as { displayName?: string };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (displayName !== undefined) updates.displayName = displayName;

    const [updated] = await db.update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, request.userId!))
      .returning();

    if (!updated) {
      return reply.status(404).send({ error: 'Not Found', message: 'User not found' });
    }

    return {
      id: updated.id,
      email: updated.email,
      displayName: updated.displayName,
      avatarColor: updated.avatarColor,
      emailVerified: updated.emailVerified,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  });

  // ═══════════════════════════════════════
  // Change Password
  // ═══════════════════════════════════════
  app.post('/change-password', {
    preHandler: [(app as any).verifyJwt],
  }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body as { currentPassword: string; newPassword: string };

    if (!newPassword || newPassword.length < 8) {
      return reply.status(400).send({ error: 'Bad Request', message: 'New password must be at least 8 characters' });
    }

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, request.userId!),
    });

    if (!user || !user.passwordHash) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Cannot change password for OAuth accounts' });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.update(schema.users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(schema.users.id, user.id));

    return { message: 'Password changed successfully' };
  });
}
