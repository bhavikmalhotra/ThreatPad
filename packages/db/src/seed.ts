import { db, schema } from './index';
import { SYSTEM_TEMPLATES, DEFAULT_TAGS } from '@threatpad/shared';

async function seed() {
  console.log('Seeding database...');

  // Seed system templates
  for (const template of SYSTEM_TEMPLATES) {
    await db
      .insert(schema.noteTemplates)
      .values({
        name: template.name,
        description: template.description,
        category: template.category,
        contentMd: template.contentMd,
        isSystem: true,
      })
      .onConflictDoNothing();
  }
  console.log(`Seeded ${SYSTEM_TEMPLATES.length} system templates`);

  // Create a demo user (email: demo@threatpad.io / password: password123)
  const [demoUser] = await db
    .insert(schema.users)
    .values({
      email: 'demo@threatpad.io',
      displayName: 'Demo Analyst',
      avatarColor: '#6366f1',
      emailVerified: true,
      // password: "password123" hashed with bcrypt (cost 12)
      passwordHash: '$2b$12$cxMnUGzSsyxODWup1EiwJO3RyDwWSHJeUlQzYxhJIK3Rv4Wt6FT1m',
    })
    .onConflictDoNothing()
    .returning();

  if (!demoUser) {
    console.log('Demo user already exists, skipping workspace/tag seed');
    process.exit(0);
    return; // TypeScript narrowing
  }

  const userId = demoUser.id;

  // Create personal workspace
  const [personalWs] = await db
    .insert(schema.workspaces)
    .values({
      name: 'Personal',
      isPersonal: true,
      ownerId: userId,
    })
    .returning();

  // Create team workspace
  const [teamWs] = await db
    .insert(schema.workspaces)
    .values({
      name: 'CTI Team',
      description: 'Cyber Threat Intelligence team workspace',
      isPersonal: false,
      ownerId: userId,
    })
    .returning();

  // Add user as owner of both workspaces
  await db.insert(schema.workspaceMembers).values([
    { workspaceId: personalWs!.id, userId, role: 'owner' as const },
    { workspaceId: teamWs!.id, userId, role: 'owner' as const },
  ]);

  // Seed default tags for team workspace
  for (const tag of DEFAULT_TAGS) {
    await db.insert(schema.tags).values({
      workspaceId: teamWs!.id,
      name: tag.name,
      color: tag.color,
      isSystem: true,
    });
  }
  console.log(`Seeded ${DEFAULT_TAGS.length} default tags`);

  // Create sample folders
  const [folder1] = await db.insert(schema.folders).values({
    workspaceId: teamWs!.id,
    name: 'Active Investigations',
    position: 0,
    depth: 0,
    createdBy: userId,
  }).returning();

  await db.insert(schema.folders).values([
    {
      workspaceId: teamWs!.id,
      parentId: folder1!.id,
      name: 'APT29 Campaign',
      position: 0,
      depth: 1,
      createdBy: userId,
    },
    {
      workspaceId: teamWs!.id,
      name: 'IOC Collections',
      position: 1,
      depth: 0,
      createdBy: userId,
    },
    {
      workspaceId: teamWs!.id,
      name: 'Threat Actor Profiles',
      position: 2,
      depth: 0,
      createdBy: userId,
    },
  ]);

  console.log('Seeded folders');
  console.log('Database seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
