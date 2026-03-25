'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';

export default function ProfilePage() {
  const { user, setUser, accessToken } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const initials = (user?.displayName || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('');

  const handleSave = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await api.patch<{
        id: string;
        email: string;
        displayName: string;
        avatarColor: string;
        emailVerified: boolean;
        createdAt: string;
        updatedAt: string;
      }>('/api/auth/me', { displayName: displayName.trim() });
      if (user && accessToken) {
        setUser({ ...user, displayName: displayName.trim() }, accessToken);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess(false);
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    setChangingPassword(true);
    try {
      await api.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    }
    setChangingPassword(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-6">Profile Settings</h1>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback
              style={{ backgroundColor: user?.avatarColor || '#6366f1' }}
              className="text-lg text-white"
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-medium">{user?.displayName || 'User'}</h2>
            <p className="text-sm text-muted-foreground">{user?.email || ''}</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <Label>Display Name</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <Label>Email</Label>
          <Input value={user?.email || ''} disabled />
          <p className="text-xs text-muted-foreground">
            Contact an admin to change your email.
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </Button>

        <Separator />

        <div>
          <h2 className="text-lg font-semibold">Change Password</h2>
          {passwordError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive mt-2">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="rounded-md bg-green-500/10 border border-green-500/20 px-3 py-2 text-sm text-green-500 mt-2">
              Password changed successfully.
            </div>
          )}
          <div className="space-y-3 mt-3">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={handleChangePassword}
              disabled={changingPassword}
            >
              {changingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
