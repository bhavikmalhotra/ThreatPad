import type { ExportPlugin } from '@threatpad/shared/types';
import { defang } from '@threatpad/shared';

export const jsonExporter: ExportPlugin = {
  key: 'json',
  label: 'JSON',
  description: 'JSON format with IOC details',
  fileExtension: '.json',
  contentType: 'application/json',

  async export({ noteId, iocs }) {
    const exportData = iocs.map((ioc) => ({
      type: ioc.type,
      value: ioc.value,
      defanged: ioc.defangedValue || defang(ioc.value),
      confidence: ioc.confidence,
      context: ioc.context,
    }));

    return {
      data: { iocs: exportData, noteId, exportedAt: new Date().toISOString() },
      contentType: 'application/json',
      filename: `iocs-${noteId}.json`,
    };
  },
};
