'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';

export default function OAuthCallbackPage() {
  return (
    <Suspense>
      <OAuthCallbackContent />
    </Suspense>
  );
}

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const error = searchParams.get('error');

    if (error) {
      router.replace(`/login?error=${error}`);
      return;
    }

    if (!accessToken) {
      router.replace('/login?error=oauth_failed');
      return;
    }

    // Store the token, then fetch user profile
    useAuthStore.getState().setToken(accessToken);

    api.get<{
      id: string;
      email: string;
      displayName: string;
      avatarColor: string;
      emailVerified: boolean;
      createdAt: string;
    }>('/api/auth/me')
      .then((user) => {
        useAuthStore.getState().setUser(
          {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            avatarColor: user.avatarColor,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
            updatedAt: user.createdAt,
          },
          accessToken,
        );
        router.replace('/dashboard');
      })
      .catch(() => {
        router.replace('/login?error=oauth_failed');
      });
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
