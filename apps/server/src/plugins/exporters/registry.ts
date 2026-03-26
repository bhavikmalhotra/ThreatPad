import type { ExportPlugin, ExportFormatInfo } from '@threatpad/shared/types';

const plugins: ExportPlugin[] = [];

export const exportRegistry = {
  register(plugin: ExportPlugin) {
    if (plugins.find((p) => p.key === plugin.key)) {
      throw new Error(`Export plugin "${plugin.key}" already registered`);
    }
    plugins.push(plugin);
  },

  get(key: string): ExportPlugin | undefined {
    return plugins.find((p) => p.key === key);
  },

  list(): ExportFormatInfo[] {
    return plugins.map(({ export: _export, ...info }) => info);
  },
};
