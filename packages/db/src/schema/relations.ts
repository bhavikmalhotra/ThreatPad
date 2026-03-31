import { relations } from 'drizzle-orm';
import { users } from './users';
import { workspaces, workspaceMembers } from './workspaces';
import { folders } from './folders';
import { noteTemplates } from './templates';
import { notes, notePermissions, noteVersions } from './notes';
import { tags, noteTags } from './tags';
import { noteIocs } from './iocs';
import { auditLogs } from './audit-logs';
import { refreshTokens, verificationTokens, workspaceInvitations } from './auth';
import { uploads } from './uploads';

// ── Users ──
export const usersRelations = relations(users, ({ many }) => ({
  ownedWorkspaces: many(workspaces),
  memberships: many(workspaceMembers),
  createdNotes: many(notes),
  createdFolders: many(folders),
  refreshTokens: many(refreshTokens),
  verificationTokens: many(verificationTokens),
  noteVersions: many(noteVersions),
  uploads: many(uploads),
}));

// ── Workspaces ──
export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, { fields: [workspaces.ownerId], references: [users.id] }),
  members: many(workspaceMembers),
  folders: many(folders),
  notes: many(notes),
  tags: many(tags),
  templates: many(noteTemplates),
  auditLogs: many(auditLogs),
  invitations: many(workspaceInvitations),
  uploads: many(uploads),
}));

// ── Workspace Members ──
export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, { fields: [workspaceMembers.workspaceId], references: [workspaces.id] }),
  user: one(users, { fields: [workspaceMembers.userId], references: [users.id] }),
}));

// ── Folders ──
export const foldersRelations = relations(folders, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [folders.workspaceId], references: [workspaces.id] }),
  creator: one(users, { fields: [folders.createdBy], references: [users.id] }),
  parent: one(folders, { fields: [folders.parentId], references: [folders.id], relationName: 'folderHierarchy' }),
  children: many(folders, { relationName: 'folderHierarchy' }),
  notes: many(notes),
}));

// ── Note Templates ──
export const noteTemplatesRelations = relations(noteTemplates, ({ one }) => ({
  workspace: one(workspaces, { fields: [noteTemplates.workspaceId], references: [workspaces.id] }),
  creator: one(users, { fields: [noteTemplates.createdBy], references: [users.id] }),
}));

// ── Notes ──
export const notesRelations = relations(notes, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [notes.workspaceId], references: [workspaces.id] }),
  folder: one(folders, { fields: [notes.folderId], references: [folders.id] }),
  template: one(noteTemplates, { fields: [notes.templateId], references: [noteTemplates.id] }),
  creator: one(users, { fields: [notes.createdBy], references: [users.id] }),
  versions: many(noteVersions),
  permissions: many(notePermissions),
  tags: many(noteTags),
  iocs: many(noteIocs),
}));

// ── Note Versions ──
export const noteVersionsRelations = relations(noteVersions, ({ one }) => ({
  note: one(notes, { fields: [noteVersions.noteId], references: [notes.id] }),
  creator: one(users, { fields: [noteVersions.createdBy], references: [users.id] }),
}));

// ── Note Permissions ──
export const notePermissionsRelations = relations(notePermissions, ({ one }) => ({
  note: one(notes, { fields: [notePermissions.noteId], references: [notes.id] }),
  user: one(users, { fields: [notePermissions.userId], references: [users.id] }),
  grantedByUser: one(users, { fields: [notePermissions.grantedBy], references: [users.id] }),
}));

// ── Tags ──
export const tagsRelations = relations(tags, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [tags.workspaceId], references: [workspaces.id] }),
  creator: one(users, { fields: [tags.createdBy], references: [users.id] }),
  noteTags: many(noteTags),
}));

// ── Note Tags (junction) ──
export const noteTagsRelations = relations(noteTags, ({ one }) => ({
  note: one(notes, { fields: [noteTags.noteId], references: [notes.id] }),
  tag: one(tags, { fields: [noteTags.tagId], references: [tags.id] }),
}));

// ── Note IOCs ──
export const noteIocsRelations = relations(noteIocs, ({ one }) => ({
  note: one(notes, { fields: [noteIocs.noteId], references: [notes.id] }),
}));

// ── Audit Logs ──
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  workspace: one(workspaces, { fields: [auditLogs.workspaceId], references: [workspaces.id] }),
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

// ── Refresh Tokens ──
export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));

// ── Verification Tokens ──
export const verificationTokensRelations = relations(verificationTokens, ({ one }) => ({
  user: one(users, { fields: [verificationTokens.userId], references: [users.id] }),
}));

// ── Workspace Invitations ──
export const workspaceInvitationsRelations = relations(workspaceInvitations, ({ one }) => ({
  workspace: one(workspaces, { fields: [workspaceInvitations.workspaceId], references: [workspaces.id] }),
  inviter: one(users, { fields: [workspaceInvitations.invitedBy], references: [users.id] }),
}));

// ── Uploads ──
export const uploadsRelations = relations(uploads, ({ one }) => ({
  workspace: one(workspaces, { fields: [uploads.workspaceId], references: [workspaces.id] }),
  uploader: one(users, { fields: [uploads.uploadedBy], references: [users.id] }),
}));
