'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';

interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    email: string;
  } | null;
}

const actionColors: Record<string, string> = {
  create: 'bg-green-500/20 text-green-400',
  update: 'bg-blue-500/20 text-blue-400',
  delete: 'bg-red-500/20 text-red-400',
  share: 'bg-purple-500/20 text-purple-400',
  export: 'bg-yellow-500/20 text-yellow-400',
  login: 'bg-muted text-muted-foreground',
  logout: 'bg-muted text-muted-foreground',
  restore: 'bg-teal-500/20 text-teal-400',
  role_change: 'bg-orange-500/20 text-orange-400',
  view: 'bg-muted text-muted-foreground',
};

export default function AuditLogPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: AuditLog[] }>(`/api/workspaces/${workspaceId}/audit-logs?limit=50`)
      .then((res) => setLogs(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Workspace Settings</h1>
      <nav className="flex gap-4 mb-6 border-b border-border pb-2 text-sm">
        <Link href={`/workspace/${workspaceId}/settings`} className="text-muted-foreground hover:text-foreground pb-2">General</Link>
        <Link href={`/workspace/${workspaceId}/settings/members`} className="text-muted-foreground hover:text-foreground pb-2">Members</Link>
        <span className="text-foreground font-medium border-b-2 border-primary pb-2">Audit Log</span>
      </nav>

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No audit log entries yet.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
            >
              <Badge
                variant="secondary"
                className={`text-[10px] ${actionColors[log.action] || ''}`}
              >
                {log.action}
              </Badge>
              <div className="min-w-0 flex-1 text-sm">
                <span className="font-medium">{log.user?.displayName || 'Unknown'}</span>
                <span className="text-muted-foreground">
                  {' '}
                  {log.action === 'login' || log.action === 'logout'
                    ? log.action === 'login' ? 'signed in' : 'signed out'
                    : `${log.action}d ${log.resourceType}`}
                </span>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatRelativeDate(log.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
