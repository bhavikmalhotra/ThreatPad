'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import type { LoginResponse } from '@threatpad/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

interface AuthConfig {
  selfHosted: boolean;
  registrationDisabled: boolean;
  setupRequired: boolean;
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<AuthConfig | null>(null);

  const oauthError = searchParams.get('error');
  const registered = searchParams.get('registered');

  useEffect(() => {
    api.get<AuthConfig>('/api/auth/config')
      .then((data) => {
        if (data.setupRequired) {
          router.replace('/setup');
          return;
        }
        setConfig(data);
      })
      .catch(() => {
        // If config endpoint fails, show normal login
        setConfig({ selfHosted: false, registrationDisabled: false, setupRequired: false });
      });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.post<LoginResponse>('/api/auth/login', {
        email,
        password,
      });
      useAuthStore.getState().setUser(
        {
          id: data.user.id,
          email: data.user.email,
          displayName: data.user.displayName,
          avatarColor: data.user.avatarColor,
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        data.accessToken,
      );
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/api/auth/oauth/google`;
  };

  const handleGithubLogin = () => {
    window.location.href = `${API_URL}/api/auth/oauth/github`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 lg:hidden mb-8">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold">ThreatPad</span>
      </div>

      <div>
        <h2 className="text-2xl font-bold">Sign in</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your credentials to access your workspace
        </p>
      </div>

      {registered && (
        <div className="rounded-md bg-green-500/10 border border-green-500/20 px-3 py-2 text-sm text-green-400">
          Account created! Please check your email to verify, then sign in.
        </div>
      )}

      {oauthError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
          {oauthError === 'oauth_no_email' ? 'Could not retrieve email from OAuth provider.' :
           oauthError === 'oauth_state_mismatch' ? 'OAuth session expired. Please try again.' :
           oauthError === 'oauth_domain_not_allowed' ? 'Your email domain is not allowed. Contact your administrator.' :
           'OAuth sign-in failed. Please try again.'}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="analyst@team.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button variant="outline" className="w-full gap-2" onClick={handleGoogleLogin}>
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>
        <Button variant="outline" className="w-full gap-2" onClick={handleGithubLogin}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          Continue with GitHub
        </Button>
      </div>

      {!config?.registrationDisabled && (
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      )}
    </div>
  );
}
