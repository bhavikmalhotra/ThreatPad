import type { ExportPlugin } from '@threatpad/shared/types';
import { defang } from '@threatpad/shared';

export const csvExporter: ExportPlugin = {
  key: 'csv',
  label: 'CSV',
  description: 'Comma-separated values',
  fileExtension: '.csv',
  contentType: 'text/csv',

  async export({ noteId, iocs }) {
    const header = 'type,value,defanged_value,confidence,context';
    const rows = iocs.map(
      (ioc) =>
        `"${ioc.type}","${ioc.value}","${ioc.defangedValue || defang(ioc.value)}","${ioc.confidence}","${(ioc.context || '').replace(/"/g, '""')}"`,
    );
    const csv = [header, ...rows].join('\n');

    return {
      data: csv,
      contentType: 'text/csv',
      filename: `iocs-${noteId}.csv`,
    };
  },
};
