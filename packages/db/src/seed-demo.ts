import { db, schema } from './index';
import { eq, and } from 'drizzle-orm';

/**
 * Demo seed — adds realistic CTI notes with IOCs and tags.
 * Run AFTER the regular seed: pnpm --filter @threatpad/db seed-demo
 * Does NOT modify seed.ts or any existing code.
 */

async function seedDemo() {
  console.log('Seeding demo content...');

  // Find the demo user created by seed.ts
  const [demoUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, 'demo@threatpad.io'))
    .limit(1);

  if (!demoUser) {
    console.error('Demo user not found. Run the regular seed first: pnpm --filter @threatpad/db seed');
    process.exit(1);
  }

  const userId = demoUser.id;

  // Find the CTI Team workspace
  const [teamWs] = await db
    .select()
    .from(schema.workspaces)
    .where(and(eq(schema.workspaces.name, 'CTI Team'), eq(schema.workspaces.ownerId, userId)))
    .limit(1);

  if (!teamWs) {
    console.error('CTI Team workspace not found. Run the regular seed first.');
    process.exit(1);
  }

  const wsId = teamWs.id;

  // Get existing folders
  const folders = await db
    .select()
    .from(schema.folders)
    .where(eq(schema.folders.workspaceId, wsId));

  const activeInvestigations = folders.find(f => f.name === 'Active Investigations');
  const iocCollections = folders.find(f => f.name === 'IOC Collections');
  const threatActorProfiles = folders.find(f => f.name === 'Threat Actor Profiles');
  const apt29Folder = folders.find(f => f.name === 'APT29 Campaign');

  // Get existing tags
  const allTags = await db
    .select()
    .from(schema.tags)
    .where(eq(schema.tags.workspaceId, wsId));

  const tagMap = Object.fromEntries(allTags.map(t => [t.name, t.id]));

  // --- Notes ---

  const notesData = [
    {
      title: 'APT29 Midnight Blizzard — March 2026 Campaign',
      folderId: apt29Folder?.id ?? activeInvestigations?.id ?? null,
      pinned: true,
      tags: ['Threat Actor', 'Campaign', 'IOC'],
      contentMd: `<h2>APT29 / Midnight Blizzard — Spear-Phishing Wave (March 2026)</h2>
<p>Tracking an ongoing spear-phishing campaign attributed to APT29 (Midnight Blizzard / Cozy Bear) targeting European diplomatic institutions and think tanks.</p>
<h3>Initial Access</h3>
<p>Phishing emails impersonate EU policy briefing invitations. Attachments are ISO files containing a malicious LNK that drops a DLL side-loader.</p>
<h3>Infrastructure</h3>
<ul>
<li>C2 domain: <code>update-policy.eu-west[.]com</code></li>
<li>Fallback C2: <code>185.220.101.34</code></li>
<li>Payload staging: <code>https://cdn-static.blob-analytics[.]net/doc/briefing.iso</code></li>
<li>Exfil endpoint: <code>45.153.241.89</code></li>
</ul>
<h3>Payload Analysis</h3>
<p>SHA256 of ISO: <code>e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</code></p>
<p>SHA256 of DLL: <code>a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a</code></p>
<p>The DLL is a Cobalt Strike beacon with sleep jitter and custom malleable profile mimicking Microsoft Graph API traffic.</p>
<h3>TTPs (MITRE ATT&CK)</h3>
<ul>
<li>T1566.001 — Spearphishing Attachment</li>
<li>T1204.002 — User Execution: Malicious File</li>
<li>T1574.002 — DLL Side-Loading</li>
<li>T1071.001 — Web Protocols (HTTPS C2)</li>
<li>T1048.003 — Exfiltration Over Unencrypted Non-C2 Protocol</li>
</ul>
<h3>Recommendations</h3>
<p>Block the listed IOCs at perimeter. Hunt for ISO mount events followed by rundll32 execution. Alert on connections to blob-analytics[.]net.</p>`,
      iocs: [
        { type: 'domain' as const, value: 'update-policy.eu-west.com', defangedValue: 'update-policy.eu-west[.]com', context: 'Primary C2 domain' },
        { type: 'ipv4' as const, value: '185.220.101.34', defangedValue: '185[.]220[.]101[.]34', context: 'Fallback C2 server' },
        { type: 'ipv4' as const, value: '45.153.241.89', defangedValue: '45[.]153[.]241[.]89', context: 'Exfiltration endpoint' },
        { type: 'url' as const, value: 'https://cdn-static.blob-analytics.net/doc/briefing.iso', defangedValue: 'hxxps://cdn-static.blob-analytics[.]net/doc/briefing.iso', context: 'Payload staging URL' },
        { type: 'domain' as const, value: 'cdn-static.blob-analytics.net', defangedValue: 'cdn-static.blob-analytics[.]net', context: 'Payload hosting domain' },
        { type: 'sha256' as const, value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', defangedValue: null, context: 'ISO file hash' },
        { type: 'sha256' as const, value: 'a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a', defangedValue: null, context: 'DLL payload hash' },
      ],
    },
    {
      title: 'LockBit 4.0 Ransomware — IOC Dump',
      folderId: iocCollections?.id ?? null,
      pinned: false,
      tags: ['IOC', 'Malware'],
      contentMd: `<h2>LockBit 4.0 Ransomware IOCs</h2>
<p>Collected from incident response engagements and open-source feeds. Last updated March 2026.</p>
<h3>Network Indicators</h3>
<table><thead><tr><th>Type</th><th>Value</th><th>Context</th></tr></thead><tbody>
<tr><td>Domain</td><td><code>lockbit-decryptor[.]onion.ws</code></td><td>Payment portal proxy</td></tr>
<tr><td>IP</td><td><code>91.215.85.142</code></td><td>C2 server (Bulletproof hosting)</td></tr>
<tr><td>IP</td><td><code>193.233.20.57</code></td><td>Exfil staging</td></tr>
<tr><td>URL</td><td><code>http://91.215.85.142:8443/upload</code></td><td>Data exfiltration endpoint</td></tr>
<tr><td>Email</td><td><code>lockbit-support@protonmail.com</code></td><td>Ransom negotiation contact</td></tr>
</tbody></table>
<h3>File Indicators</h3>
<table><thead><tr><th>Type</th><th>Hash</th><th>Filename</th></tr></thead><tbody>
<tr><td>SHA256</td><td><code>b94f3ff666d9781cb69088658cd53f7bb0e5c0197b25a44e0870842a3bb06a8d</code></td><td>lockbit_loader.exe</td></tr>
<tr><td>MD5</td><td><code>d41d8cd98f00b204e9800998ecf8427e</code></td><td>Encrypted README dropper</td></tr>
<tr><td>SHA1</td><td><code>da39a3ee5e6b4b0d3255bfef95601890afd80709</code></td><td>Lateral movement script</td></tr>
</tbody></table>
<h3>Behavioral Indicators</h3>
<ul>
<li>Deletes shadow copies via <code>vssadmin delete shadows /all /quiet</code></li>
<li>Disables Windows Defender via registry modification</li>
<li>Uses WMI for lateral movement</li>
<li>Drops ransom note as <code>RESTORE-MY-FILES.txt</code> in every directory</li>
</ul>
<h3>CVEs Exploited</h3>
<p>CVE-2024-1709 (ConnectWise ScreenConnect auth bypass) and CVE-2023-4966 (Citrix Bleed) remain primary initial access vectors.</p>`,
      iocs: [
        { type: 'domain' as const, value: 'lockbit-decryptor.onion.ws', defangedValue: 'lockbit-decryptor[.]onion[.]ws', context: 'Payment portal proxy' },
        { type: 'ipv4' as const, value: '91.215.85.142', defangedValue: '91[.]215[.]85[.]142', context: 'C2 server' },
        { type: 'ipv4' as const, value: '193.233.20.57', defangedValue: '193[.]233[.]20[.]57', context: 'Exfil staging' },
        { type: 'url' as const, value: 'http://91.215.85.142:8443/upload', defangedValue: 'hxxp://91[.]215[.]85[.]142:8443/upload', context: 'Exfiltration endpoint' },
        { type: 'email' as const, value: 'lockbit-support@protonmail.com', defangedValue: null, context: 'Ransom negotiation contact' },
        { type: 'sha256' as const, value: 'b94f3ff666d9781cb69088658cd53f7bb0e5c0197b25a44e0870842a3bb06a8d', defangedValue: null, context: 'lockbit_loader.exe' },
        { type: 'md5' as const, value: 'd41d8cd98f00b204e9800998ecf8427e', defangedValue: null, context: 'Encrypted README dropper' },
        { type: 'sha1' as const, value: 'da39a3ee5e6b4b0d3255bfef95601890afd80709', defangedValue: null, context: 'Lateral movement script' },
        { type: 'cve' as const, value: 'CVE-2024-1709', defangedValue: null, context: 'ConnectWise ScreenConnect auth bypass' },
        { type: 'cve' as const, value: 'CVE-2023-4966', defangedValue: null, context: 'Citrix Bleed' },
      ],
    },
    {
      title: 'Lazarus Group — Threat Actor Profile',
      folderId: threatActorProfiles?.id ?? null,
      pinned: true,
      tags: ['Threat Actor', 'TTP', 'Report'],
      contentMd: `<h2>Lazarus Group (HIDDEN COBRA / APT38)</h2>
<h3>Overview</h3>
<p>North Korean state-sponsored APT group active since at least 2009. Operates under the Reconnaissance General Bureau (RGB). Known for financially motivated attacks (cryptocurrency theft, SWIFT banking fraud) and destructive operations.</p>
<h3>Attribution</h3>
<ul>
<li><strong>Country:</strong> DPRK (North Korea)</li>
<li><strong>Aliases:</strong> HIDDEN COBRA, Zinc, APT38, BlueNoroff (financial sub-group), Andariel (sub-group)</li>
<li><strong>Motivation:</strong> Financial gain (sanctions evasion), espionage, destruction</li>
</ul>
<h3>Notable Operations</h3>
<ul>
<li>Sony Pictures hack (2014) — destructive wiper attack</li>
<li>Bangladesh Bank SWIFT heist (2016) — $81M stolen</li>
<li>WannaCry ransomware (2017) — global impact</li>
<li>Axie Infinity / Ronin Bridge hack (2022) — $620M crypto theft</li>
<li>Bybit exchange hack (2025) — $1.5B crypto theft</li>
</ul>
<h3>Common TTPs</h3>
<table><thead><tr><th>Tactic</th><th>Technique</th><th>ID</th></tr></thead><tbody>
<tr><td>Initial Access</td><td>Spearphishing via LinkedIn/job offers</td><td>T1566.001</td></tr>
<tr><td>Execution</td><td>Trojanized trading/crypto apps</td><td>T1204.002</td></tr>
<tr><td>Persistence</td><td>Startup folder, scheduled tasks</td><td>T1547.001</td></tr>
<tr><td>Defense Evasion</td><td>Code signing with stolen certs</td><td>T1553.002</td></tr>
<tr><td>C2</td><td>Custom HTTP/S protocols</td><td>T1071.001</td></tr>
<tr><td>Exfiltration</td><td>Data staged to cloud services</td><td>T1567.002</td></tr>
</tbody></table>
<h3>Recent Infrastructure</h3>
<ul>
<li>Domain: <code>careers-blockchain[.]com</code></li>
<li>Domain: <code>defi-exchange-support[.]org</code></li>
<li>IP: <code>103.114.163.22</code></li>
</ul>
<h3>Detection Guidance</h3>
<p>Monitor for: unsigned executables in user temp folders making HTTPS connections to recently registered domains, cryptocurrency wallet file access patterns, and anomalous outbound traffic volumes from developer workstations.</p>`,
      iocs: [
        { type: 'domain' as const, value: 'careers-blockchain.com', defangedValue: 'careers-blockchain[.]com', context: 'Lazarus recruitment phishing domain' },
        { type: 'domain' as const, value: 'defi-exchange-support.org', defangedValue: 'defi-exchange-support[.]org', context: 'Fake DeFi support domain' },
        { type: 'ipv4' as const, value: '103.114.163.22', defangedValue: '103[.]114[.]163[.]22', context: 'Lazarus C2 infrastructure' },
      ],
    },
    {
      title: 'Weekly Incident Summary — W13 2026',
      folderId: activeInvestigations?.id ?? null,
      pinned: false,
      tags: ['Incident', 'Report'],
      contentMd: `<h2>Incident Summary — Week 13 (March 24–28, 2026)</h2>
<h3>INC-2026-0087 — Phishing Campaign Targeting Finance Dept</h3>
<p><strong>Status:</strong> Contained | <strong>Severity:</strong> Medium</p>
<p>Three users in Finance received emails from <code>invoice-notice@acct-services-portal[.]com</code> with links to a credential harvesting page at <code>https://acct-services-portal[.]com/auth/office365</code>. One user submitted credentials before the page was taken down. Password reset forced, session tokens revoked, MFA enrollment verified.</p>
<p>Harvesting IP: <code>172.67.182.31</code></p>
<h3>INC-2026-0088 — Unauthorized Access Attempt on VPN</h3>
<p><strong>Status:</strong> Investigating | <strong>Severity:</strong> High</p>
<p>Spike in failed VPN authentication attempts from <code>45.95.169.222</code> targeting multiple service accounts. Pattern suggests credential stuffing from a recent third-party breach. Geo: Russia. Blocked at firewall, monitoring for successful auth from unusual geos.</p>
<h3>INC-2026-0089 — Malware on Marketing Workstation</h3>
<p><strong>Status:</strong> Remediated | <strong>Severity:</strong> Low</p>
<p>EDR flagged <code>ChromeUpdate.exe</code> (SHA256: <code>9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08</code>) on MKTG-WS-04. Turns out it was a crypto miner sideloaded via a free stock photo tool. Machine reimaged. User counseled on software installation policy.</p>
<h3>Action Items</h3>
<ul>
<li>[ ] Escalate INC-0088 VPN credential stuffing — check if any service account succeeded</li>
<li>[ ] Block <code>acct-services-portal[.]com</code> across all proxy rules</li>
<li>[ ] Update phishing awareness training deck with INC-0087 example</li>
</ul>`,
      iocs: [
        { type: 'domain' as const, value: 'acct-services-portal.com', defangedValue: 'acct-services-portal[.]com', context: 'Credential harvesting domain' },
        { type: 'url' as const, value: 'https://acct-services-portal.com/auth/office365', defangedValue: 'hxxps://acct-services-portal[.]com/auth/office365', context: 'Phishing page URL' },
        { type: 'email' as const, value: 'invoice-notice@acct-services-portal.com', defangedValue: null, context: 'Phishing sender email' },
        { type: 'ipv4' as const, value: '172.67.182.31', defangedValue: '172[.]67[.]182[.]31', context: 'Credential harvesting server' },
        { type: 'ipv4' as const, value: '45.95.169.222', defangedValue: '45[.]95[.]169[.]222', context: 'VPN brute-force source (Russia)' },
        { type: 'sha256' as const, value: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08', defangedValue: null, context: 'ChromeUpdate.exe — crypto miner' },
      ],
    },
    {
      title: 'CVE-2024-1709 — ConnectWise ScreenConnect Auth Bypass',
      folderId: iocCollections?.id ?? null,
      pinned: false,
      tags: ['Vulnerability', 'IOC'],
      contentMd: `<h2>CVE-2024-1709 — ConnectWise ScreenConnect Authentication Bypass</h2>
<h3>Summary</h3>
<p><strong>CVSS:</strong> 10.0 (Critical) | <strong>Type:</strong> Authentication Bypass | <strong>Affected:</strong> ScreenConnect &lt; 23.9.8</p>
<p>Path traversal vulnerability in ConnectWise ScreenConnect that allows unauthenticated attackers to access the setup wizard and create admin accounts on already-configured instances. Trivially exploitable, widely exploited in the wild.</p>
<h3>Exploitation</h3>
<p>Attackers append <code>/SetupWizard.aspx/</code> followed by a directory traversal to reach the setup endpoint. Once admin access is achieved, they deploy Cobalt Strike, ransomware (LockBit, Black Basta), or remote access tools.</p>
<h3>Observed Post-Exploitation</h3>
<ul>
<li>Cobalt Strike beacons calling back to <code>88.214.26.9</code></li>
<li>Black Basta ransomware deployment</li>
<li>Credential dumping via Mimikatz</li>
<li>Lateral movement through deployed ScreenConnect agents</li>
</ul>
<h3>Detection</h3>
<ul>
<li>Monitor web logs for requests containing <code>/SetupWizard.aspx</code> on ScreenConnect servers</li>
<li>Alert on new admin account creation in ScreenConnect audit logs</li>
<li>Hunt for <code>ScreenConnect.ClientService.exe</code> spawning unexpected child processes</li>
</ul>
<h3>Remediation</h3>
<p>Patch to ScreenConnect 23.9.8 or later. If unpatched instances were internet-facing, assume compromise — conduct forensic review before patching.</p>`,
      iocs: [
        { type: 'cve' as const, value: 'CVE-2024-1709', defangedValue: null, context: 'ScreenConnect auth bypass — CVSS 10.0' },
        { type: 'ipv4' as const, value: '88.214.26.9', defangedValue: '88[.]214[.]26[.]9', context: 'Cobalt Strike C2 post-exploitation' },
      ],
    },
  ];

  for (const noteData of notesData) {
    // Insert note
    const [note] = await db
      .insert(schema.notes)
      .values({
        workspaceId: wsId,
        folderId: noteData.folderId,
        title: noteData.title,
        contentMd: noteData.contentMd,
        visibility: 'workspace',
        createdBy: userId,
        pinned: noteData.pinned,
        wordCount: noteData.contentMd.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length,
      })
      .returning();

    if (!note) continue;

    // Insert IOCs
    if (noteData.iocs.length > 0) {
      await db.insert(schema.noteIocs).values(
        noteData.iocs.map(ioc => ({
          noteId: note.id,
          type: ioc.type,
          value: ioc.value,
          defangedValue: ioc.defangedValue,
          confidence: 100,
          context: ioc.context,
        }))
      );
    }

    // Attach tags
    for (const tagName of noteData.tags) {
      const tagId = tagMap[tagName];
      if (tagId) {
        await db.insert(schema.noteTags).values({ noteId: note.id, tagId }).onConflictDoNothing();
      }
    }

    console.log(`  Created: ${noteData.title} (${noteData.iocs.length} IOCs, ${noteData.tags.length} tags)`);
  }

  console.log('\nDemo content seeding complete!');
  console.log('Login: demo@threatpad.io / password123');
  process.exit(0);
}

seedDemo().catch((err) => {
  console.error('Demo seed failed:', err);
  process.exit(1);
});
