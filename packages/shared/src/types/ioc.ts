export type IocType =
  | 'ipv4'
  | 'ipv6'
  | 'domain'
  | 'url'
  | 'email'
  | 'md5'
  | 'sha1'
  | 'sha256'
  | 'cve'
  | 'other';

export interface Ioc {
  id: string;
  noteId: string;
  type: IocType;
  value: string;
  defangedValue?: string | null;
  confidence: number;
  firstSeenAt: string;
  context?: string | null;
}

export interface IocExtractionResult {
  noteId: string;
  extractedAt: string;
  summary: {
    total: number;
    byType: Partial<Record<IocType, number>>;
  };
  iocs: Ioc[];
}
