/** Serializable metadata about an export format (sent to frontend) */
export interface ExportFormatInfo {
  key: string;
  label: string;
  description?: string;
  fileExtension: string;
  contentType: string;
}

/** Full export plugin with the export function (server-side only) */
export interface ExportPlugin extends ExportFormatInfo {
  export(params: ExportParams): Promise<ExportResult>;
}

export interface ExportParams {
  noteId: string;
  iocs: Array<{
    id: string;
    type: string;
    value: string;
    defangedValue: string | null;
    confidence: number | null;
    firstSeenAt: Date | string;
    context: string | null;
  }>;
  note?: {
    id: string;
    title: string;
    contentMd: string;
    createdAt: Date | string;
    updatedAt: Date | string;
  } | null;
}

export interface ExportResult {
  data: string | object;
  contentType: string;
  filename: string;
}
