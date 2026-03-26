import crypto from 'crypto';
import type { ExportPlugin } from '@threatpad/shared/types';

function iocToStixPattern(type: string, value: string): string {
  const escaped = value.replace(/'/g, "\\'");
  switch (type) {
    case 'ipv4': return `[ipv4-addr:value = '${escaped}']`;
    case 'ipv6': return `[ipv6-addr:value = '${escaped}']`;
    case 'domain': return `[domain-name:value = '${escaped}']`;
    case 'url': return `[url:value = '${escaped}']`;
    case 'email': return `[email-addr:value = '${escaped}']`;
    case 'md5': return `[file:hashes.MD5 = '${escaped}']`;
    case 'sha1': return `[file:hashes.'SHA-1' = '${escaped}']`;
    case 'sha256': return `[file:hashes.'SHA-256' = '${escaped}']`;
    case 'cve': return `[vulnerability:name = '${escaped}']`;
    default: return `[artifact:payload_bin = '${escaped}']`;
  }
}

export const stixExporter: ExportPlugin = {
  key: 'stix',
  label: 'STIX 2.1',
  description: 'STIX 2.1 bundle with indicators',
  fileExtension: '.json',
  contentType: 'application/json',

  async export({ noteId, iocs, note }) {
    const now = new Date().toISOString();
    const stixObjects: any[] = [];

    // Identity for the exporter
    const identityId = `identity--${crypto.randomUUID()}`;
    stixObjects.push({
      type: 'identity',
      spec_version: '2.1',
      id: identityId,
      created: now,
      modified: now,
      name: 'ThreatPad',
      identity_class: 'tool',
    });

    const indicatorIds: string[] = [];

    // Create Indicator for each IOC
    for (const ioc of iocs) {
      const indicatorId = `indicator--${crypto.randomUUID()}`;
      indicatorIds.push(indicatorId);

      const pattern = iocToStixPattern(ioc.type, ioc.value);
      stixObjects.push({
        type: 'indicator',
        spec_version: '2.1',
        id: indicatorId,
        created: ioc.firstSeenAt || now,
        modified: now,
        name: `${ioc.type.toUpperCase()}: ${ioc.value}`,
        description: ioc.context || undefined,
        pattern,
        pattern_type: 'stix',
        valid_from: ioc.firstSeenAt || now,
        confidence: ioc.confidence || 100,
        created_by_ref: identityId,
        labels: [ioc.type],
      });
    }

    // If we have a note, create a Report linking all indicators
    if (note) {
      const reportId = `report--${crypto.randomUUID()}`;
      stixObjects.push({
        type: 'report',
        spec_version: '2.1',
        id: reportId,
        created: note.createdAt,
        modified: note.updatedAt,
        name: note.title,
        description: `Exported from ThreatPad note: ${note.title}`,
        published: now,
        object_refs: indicatorIds,
        created_by_ref: identityId,
        report_types: ['threat-report'],
      });
    }

    const bundle = {
      type: 'bundle',
      id: `bundle--${crypto.randomUUID()}`,
      objects: stixObjects,
    };

    return {
      data: bundle,
      contentType: 'application/json',
      filename: `stix-${noteId}.json`,
    };
  },
};
