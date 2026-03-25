export type TemplateCategory =
  | 'ioc_dump'
  | 'threat_actor'
  | 'incident'
  | 'campaign'
  | 'blank'
  | 'custom';

export interface NoteTemplate {
  id: string;
  workspaceId?: string | null;
  name: string;
  description?: string | null;
  category: TemplateCategory;
  contentMd: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}
