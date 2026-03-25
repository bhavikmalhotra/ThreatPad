'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';

interface SetupResponse {
  user: { id: string; email: string; displayName: string };
  accessToken: string;
  expiresIn: number;
}

export default function SetupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.post<SetupResponse>('/api/auth/setup', {
        email,
        password,
        displayName,
      });

      useAuthStore.getState().setUser(
        {
          id: data.user.id,
          email: data.user.email,
          displayName: data.user.displayName,
          avatarColor: '#6366f1',
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        data.accessToken,
      );

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
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
        <h2 className="text-2xl font-bold">Welcome to ThreatPad</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Create your admin account to get started
        </p>
      </div>

      <div className="rounded-md bg-primary/10 border border-primary/20 px-3 py-2 text-sm text-primary">
        This is a one-time setup. The first account created will be the admin.
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Display Name</Label>
          <Input
            id="name"
            placeholder="Admin"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="admin@yourorg.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Min 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Setting up...' : 'Create Admin Account'}
        </Button>
      </form>
    </div>
  );
}
