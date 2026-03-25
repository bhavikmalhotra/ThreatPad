'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export default function WorkspaceSettingsPage() {
  const { workspaceId } = useParams();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Workspace Settings</h1>
      <nav className="flex gap-4 mb-6 border-b border-border pb-2 text-sm">
        <span className="text-foreground font-medium border-b-2 border-primary pb-2">General</span>
        <Link href={`/workspace/${workspaceId}/settings/members`} className="text-muted-foreground hover:text-foreground pb-2">Members</Link>
        <Link href={`/workspace/${workspaceId}/settings/audit-log`} className="text-muted-foreground hover:text-foreground pb-2">Audit Log</Link>
      </nav>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label>Workspace Name</Label>
          <Input defaultValue="CTI Team" />
        </div>

        <div className="space-y-3">
          <Label>Description</Label>
          <Input defaultValue="Cyber Threat Intelligence team workspace" />
        </div>

        <Button>Save Changes</Button>

        <Separator />

        <div>
          <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Permanently delete this workspace and all its data.
          </p>
          <Button variant="destructive" className="mt-3">
            Delete Workspace
          </Button>
        </div>
      </div>
    </div>
  );
}
