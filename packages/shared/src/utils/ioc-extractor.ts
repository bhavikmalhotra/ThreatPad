import type { IocType } from '../types/ioc';
import { IOC_PATTERNS } from '../constants/ioc-patterns';

export interface ExtractedIoc {
  type: IocType;
  value: string;
  defangedValue: string | null;
  context: string;
}

export function refang(value: string): string {
  return value
    .replace(/\[\.\]/g, '.')
    .replace(/hxxp/gi, 'http')
    .replace(/\[:\]/g, ':')
    .replace(/\[at\]/gi, '@')
    .replace(/\[dot\]/gi, '.');
}

export function defang(value: string): string {
  return value
    .replace(/\./g, '[.]')
    .replace(/^http/i, 'hxxp')
    .replace(/:\/\//g, '[://]');
}

export function extractIocs(text: string): ExtractedIoc[] {
  const results: ExtractedIoc[] = [];
  const seen = new Set<string>();

  for (const { type, pattern } of IOC_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const rawValue = match[0];
      const refangedValue = refang(rawValue);
      const key = `${type}:${refangedValue}`;

      if (seen.has(key)) continue;
      seen.add(key);

      const start = Math.max(0, match.index - 50);
      const end = Math.min(text.length, match.index + rawValue.length + 50);
      const context = text.slice(start, end).replace(/\n/g, ' ').trim();

      results.push({
        type,
        value: refangedValue,
        defangedValue: rawValue !== refangedValue ? rawValue : null,
        context: `...${context}...`,
      });
    }
  }

  return results;
}
