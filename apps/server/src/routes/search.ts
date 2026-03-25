import type { FastifyInstance } from 'fastify';
import { eq, and, isNull, sql, desc } from 'drizzle-orm';
import { db, schema } from '@threatpad/db';

export async function searchRoutes(app: FastifyInstance) {
  app.addHook('preHandler', (app as any).verifyJwt);

  // Full-text search across notes in workspace
  app.get('/:workspaceId/search', {
    preHandler: [(app as any).resolveWorkspaceRole],
  }, async (request) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const { q, tags, page = '1', limit = '20' } = request.query as Record<string, string>;

    if (!q || q.trim().length === 0) {
      return { data: [], page: 1, limit: 20, total: 0 };
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build tsquery from search terms
    const searchTerms = q.trim().split(/\s+/).map((t) => t.replace(/[^a-zA-Z0-9]/g, '')).filter(Boolean);
    const tsquery = searchTerms.join(' & ');

    // Base query with full-text search
    let conditions = sql`
      ${schema.notes.workspaceId} = ${workspaceId}
      AND ${schema.notes.deletedAt} IS NULL
      AND (
        to_tsvector('english', coalesce(${schema.notes.title}, '')) ||
        to_tsvector('english', coalesce(${schema.notes.contentMd}, ''))
      ) @@ to_tsquery('english', ${tsquery})
    `;

    // Filter by tags if provided
    const tagIds = tags ? tags.split(',').filter(Boolean) : [];

    const results = await db
      .select({
        id: schema.notes.id,
        title: schema.notes.title,
        contentMd: schema.notes.contentMd,
        visibility: schema.notes.visibility,
        createdBy: schema.notes.createdBy,
        createdAt: schema.notes.createdAt,
        updatedAt: schema.notes.updatedAt,
        wordCount: schema.notes.wordCount,
        pinned: schema.notes.pinned,
        rank: sql<number>`ts_rank(
          to_tsvector('english', coalesce(${schema.notes.title}, '')) ||
          to_tsvector('english', coalesce(${schema.notes.contentMd}, '')),
          to_tsquery('english', ${tsquery})
        )`.as('rank'),
      })
      .from(schema.notes)
      .where(conditions)
      .orderBy(sql`rank DESC`)
      .limit(limitNum)
      .offset(offset);

    // Filter private notes
    const visible = results.filter(
      (n) => n.visibility !== 'private' || n.createdBy === request.userId,
    );

    // Filter by tags if needed
    let filtered = visible;
    if (tagIds.length > 0) {
      const noteTagLinks = await db.query.noteTags.findMany({
        where: sql`${schema.noteTags.tagId} IN ${tagIds}`,
      });
      const noteIdsWithTags = new Set(noteTagLinks.map((l) => l.noteId));
      filtered = visible.filter((n) => noteIdsWithTags.has(n.id));
    }

    // Generate snippets with highlights
    const enriched = filtered.map((note) => {
      const content = note.contentMd || '';
      let snippet = content.slice(0, 200);

      // Try to find a relevant snippet around the search term
      const lowerContent = content.toLowerCase();
      const firstTerm = searchTerms[0]?.toLowerCase();
      if (firstTerm) {
        const idx = lowerContent.indexOf(firstTerm);
        if (idx >= 0) {
          const start = Math.max(0, idx - 80);
          const end = Math.min(content.length, idx + firstTerm.length + 120);
          snippet = (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '');
        }
      }

      return {
        id: note.id,
        title: note.title,
        snippet,
        rank: note.rank,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        wordCount: note.wordCount,
        pinned: note.pinned,
      };
    });

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.notes)
      .where(conditions);

    return {
      data: enriched,
      page: pageNum,
      limit: limitNum,
      total: countResult?.count || 0,
    };
  });
}
