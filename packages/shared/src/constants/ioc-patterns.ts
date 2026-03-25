import type { IocType } from '../types/ioc';

export interface IocPattern {
  type: IocType;
  label: string;
  pattern: RegExp;
}

export const IOC_PATTERNS: IocPattern[] = [
  {
    type: 'ipv4',
    label: 'IPv4 Address',
    pattern:
      /(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)(?:\[\.\]|\.)(?:25[0-5]|2[0-4]\d|[01]?\d\d?)(?:\[\.\]|\.)(?:25[0-5]|2[0-4]\d|[01]?\d\d?)(?:\[\.\]|\.)(?:25[0-5]|2[0-4]\d|[01]?\d\d?))/g,
  },
  {
    type: 'ipv6',
    label: 'IPv6 Address',
    pattern:
      /(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}/g,
  },
  {
    type: 'domain',
    label: 'Domain Name',
    pattern:
      /(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\[\.\]|\.))+(?:com|net|org|io|gov|edu|mil|info|biz|co|us|uk|de|ru|cn|jp|br|in|fr|it|nl|au|ca|es|se|no|fi|dk|pl|cz|sk|hu|ro|bg|hr|rs|si|ua|by|kz|ir|sa|ae|il|za|ng|ke|gh|tz|et|eg|ma|dz|tn|ly|top|xyz|online|site|tech|store|app|dev|cloud)/gi,
  },
  {
    type: 'url',
    label: 'URL',
    pattern:
      /(?:hxxps?|https?|ftp):\/\/(?:\[?\.\]?)?[^\s<>"{}|\\^`\[\]]+/gi,
  },
  {
    type: 'email',
    label: 'Email Address',
    pattern:
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+/g,
  },
  {
    type: 'md5',
    label: 'MD5 Hash',
    pattern: /\b[a-fA-F0-9]{32}\b/g,
  },
  {
    type: 'sha1',
    label: 'SHA1 Hash',
    pattern: /\b[a-fA-F0-9]{40}\b/g,
  },
  {
    type: 'sha256',
    label: 'SHA256 Hash',
    pattern: /\b[a-fA-F0-9]{64}\b/g,
  },
  {
    type: 'cve',
    label: 'CVE Identifier',
    pattern: /CVE-\d{4}-\d{4,}/gi,
  },
];

export const DEFAULT_TAGS = [
  { name: 'IOC', color: '#ef4444' },
  { name: 'Threat Actor', color: '#f97316' },
  { name: 'Campaign', color: '#eab308' },
  { name: 'Malware', color: '#a855f7' },
  { name: 'Vulnerability', color: '#ec4899' },
  { name: 'TTP', color: '#3b82f6' },
  { name: 'Incident', color: '#14b8a6' },
  { name: 'Report', color: '#6366f1' },
] as const;
