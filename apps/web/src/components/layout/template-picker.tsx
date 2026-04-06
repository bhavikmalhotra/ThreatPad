'use client';

import { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { api } from '@/lib/api-client';

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isSystem: boolean;
}

interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (templateId: string, templateName: string) => void;
  workspaceId: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  ioc_dump: 'IOC',
  threat_actor: 'Threat Actor',
  incident: 'Incident',
  campaign: 'Campaign',
  blank: 'General',
  custom: 'Custom',
};

export function TemplatePicker({ open, onClose, onSelect, workspaceId }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !workspaceId) return;
    setLoading(true);
    api.get<{ data: Template[] }>(`/api/workspaces/${workspaceId}/templates`)
      .then((res) => setTemplates(res.data))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, [open, workspaceId]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create from Template</DialogTitle>
          <DialogDescription>Choose a template to start with</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No templates available
          </div>
        ) : (
          <div className="grid gap-2 max-h-[400px] overflow-y-auto">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelect(t.id, t.name)}
                className="flex items-start gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent"
              >
                <FileText className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{t.name}</div>
                  {t.description && (
                    <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                  )}
                  <div className="text-xs text-muted-foreground/60 mt-1">
                    {CATEGORY_LABELS[t.category] || t.category}
                    {t.isSystem && ' · System'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
