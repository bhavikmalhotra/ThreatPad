import type { TemplateCategory } from '../types/template';

export interface SystemTemplate {
  name: string;
  description: string;
  category: TemplateCategory;
  contentMd: string;
}

export const SYSTEM_TEMPLATES: SystemTemplate[] = [
  {
    name: 'IOC Dump',
    description: 'Document indicators of compromise from a source',
    category: 'ioc_dump',
    contentMd: `# IOC Dump — [Source Name]

## Metadata
- **Source:**
- **Date Collected:**
- **Confidence:** High / Medium / Low
- **TLP:** WHITE / GREEN / AMBER / RED

## Indicators

| Type | Value | Context |
|------|-------|---------|
| IPv4 |  |  |
| Domain |  |  |
| SHA256 |  |  |
| URL |  |  |

## Notes

`,
  },
  {
    name: 'Threat Actor Profile',
    description: 'Profile a threat actor or group',
    category: 'threat_actor',
    contentMd: `# Threat Actor — [Actor Name]

## Overview
- **Aliases:**
- **Motivation:** Espionage / Financial / Hacktivism / Destruction
- **First Seen:**
- **Country of Origin:**
- **Confidence:** High / Medium / Low

## Targets
- **Industries:**
- **Regions:**
- **Notable Victims:**

## TTPs (MITRE ATT&CK)

| Tactic | Technique | ID | Notes |
|--------|-----------|-----|-------|
|  |  |  |  |

## Infrastructure
- **C2 Servers:**
- **Domains:**
- **Hosting:**

## IOCs

| Type | Value | Context |
|------|-------|---------|
|  |  |  |

## References
-
`,
  },
  {
    name: 'Incident Notes',
    description: 'Document an active or past security incident',
    category: 'incident',
    contentMd: `# Incident — [Incident ID]

## Summary
- **Severity:** Critical / High / Medium / Low
- **Status:** Active / Contained / Resolved
- **Date Detected:**
- **Date Resolved:**

## Timeline

| Time | Event | Source |
|------|-------|--------|
|  |  |  |

## Affected Systems
-

## IOCs

| Type | Value | Context |
|------|-------|---------|
|  |  |  |

## Containment Actions
- [ ]

## Root Cause Analysis


## Lessons Learned

`,
  },
  {
    name: 'Campaign Tracker',
    description: 'Track an ongoing threat campaign',
    category: 'campaign',
    contentMd: `# Campaign — [Campaign Name]

## Overview
- **Timeframe:**
- **Attribution:**
- **Confidence:** High / Medium / Low
- **Status:** Active / Dormant / Concluded

## Kill Chain

| Phase | Details |
|-------|---------|
| Reconnaissance |  |
| Weaponization |  |
| Delivery |  |
| Exploitation |  |
| Installation |  |
| C2 |  |
| Actions on Objectives |  |

## IOCs

| Type | Value | First Seen | Context |
|------|-------|------------|---------|
|  |  |  |  |

## Related Reports
-
`,
  },
  {
    name: 'Blank Note',
    description: 'Start with a blank note',
    category: 'blank',
    contentMd: `# Untitled

`,
  },
];
