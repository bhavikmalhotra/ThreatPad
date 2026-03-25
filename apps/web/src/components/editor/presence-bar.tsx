'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface PresenceUser {
  id: string;
  name: string;
  color: string;
}

interface PresenceBarProps {
  users: PresenceUser[];
}

export function PresenceBar({ users }: PresenceBarProps) {
  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-card/50">
      <span className="text-xs text-muted-foreground mr-1">
        {users.length} online
      </span>
      <TooltipProvider>
        <div className="flex -space-x-1.5">
          {users.map((user) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <Avatar className="h-6 w-6 border-2 border-background">
                  <AvatarFallback
                    style={{ backgroundColor: user.color }}
                    className="text-[9px] text-white"
                  >
                    {user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>{user.name}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}
