'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { UserPlus, MoreHorizontal, Shield, Pencil, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api-client';

interface Member {
  id: string;
  role: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarColor: string;
  } | null;
}

const roleIcons = {
  owner: Shield,
  editor: Pencil,
  viewer: Eye,
};

const roleColors = {
  owner: 'bg-primary/20 text-primary',
  editor: 'bg-green-500/20 text-green-400',
  viewer: 'bg-muted text-muted-foreground',
};

export default function MembersPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [error, setError] = useState('');

  const fetchMembers = () => {
    api.get<{ data: Member[] }>(`/api/workspaces/${workspaceId}/members`)
      .then((res) => setMembers(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMembers();
  }, [workspaceId]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError('');
    try {
      await api.post(`/api/workspaces/${workspaceId}/invite`, {
        email: inviteEmail.trim(),
        role: 'editor',
      });
      setInviteEmail('');
      setShowInvite(false);
      fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite');
    }
    setInviting(false);
  };

  const handleChangeRole = async (userId: string, role: string) => {
    await api.patch(`/api/workspaces/${workspaceId}/members/${userId}`, { role });
    fetchMembers();
  };

  const handleRemove = async (userId: string) => {
    await api.delete(`/api/workspaces/${workspaceId}/members/${userId}`);
    fetchMembers();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Workspace Settings</h1>
      <nav className="flex gap-4 mb-6 border-b border-border pb-2 text-sm">
        <Link href={`/workspace/${workspaceId}/settings`} className="text-muted-foreground hover:text-foreground pb-2">General</Link>
        <span className="text-foreground font-medium border-b-2 border-primary pb-2">Members</span>
        <Link href={`/workspace/${workspaceId}/settings/audit-log`} className="text-muted-foreground hover:text-foreground pb-2">Audit Log</Link>
      </nav>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold">Members</h2>
          <p className="text-sm text-muted-foreground">
            {members.length} members
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowInvite(!showInvite)}>
          <UserPlus className="h-4 w-4" />
          Invite
        </Button>
      </div>

      {showInvite && (
        <div className="mb-4 flex gap-2">
          <Input
            placeholder="Email address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
          />
          <Button onClick={handleInvite} disabled={inviting}>
            {inviting ? 'Inviting...' : 'Add'}
          </Button>
          {error && (
            <span className="text-xs text-destructive self-center">{error}</span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {members.map((member) => {
          if (!member.user) return null;
          const RoleIcon = roleIcons[member.role as keyof typeof roleIcons] || Eye;
          return (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <Avatar>
                <AvatarFallback
                  style={{ backgroundColor: member.user.avatarColor }}
                  className="text-xs text-white"
                >
                  {member.user.displayName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{member.user.displayName}</div>
                <div className="text-xs text-muted-foreground">
                  {member.user.email}
                </div>
              </div>
              <Badge
                variant="secondary"
                className={`gap-1 ${roleColors[member.role as keyof typeof roleColors] || ''}`}
              >
                <RoleIcon className="h-3 w-3" />
                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleChangeRole(member.user!.id, 'owner')}>
                    Change to Owner
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleChangeRole(member.user!.id, 'editor')}>
                    Change to Editor
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleChangeRole(member.user!.id, 'viewer')}>
                    Change to Viewer
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleRemove(member.user!.id)}
                  >
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>
    </div>
  );
}
