'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Search, FileText, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatRelativeDate } from '@/lib/utils';
import { api } from '@/lib/api-client';

interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  rank: number;
  updatedAt: string;
  wordCount: number;
  pinned: boolean;
}

export default function SearchPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [searching, setSearching] = useState(false);

  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setTotal(0);
        return;
      }
      setSearching(true);
      try {
        const res = await api.get<{ data: SearchResult[]; total: number }>(
          `/api/workspaces/${workspaceId}/search?q=${encodeURIComponent(q.trim())}`,
        );
        setResults(res.data);
        setTotal(res.total);
      } catch {
        setResults([]);
      }
      setSearching(false);
    },
    [workspaceId],
  );

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(timeout);
  }, [query, doSearch]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold mb-4">Search</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search across all notes..."
            className="pl-10 h-10 text-base"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      {searching && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!searching && query && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground mb-4">
            {total} result{total !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
          </p>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No results found.
            </p>
          ) : (
            results.map((result) => (
              <button
                key={result.id}
                onClick={() =>
                  router.push(`/workspace/${workspaceId}/note/${result.id}`)
                }
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 hover:bg-accent transition-colors text-left w-full"
              >
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{result.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {result.snippet}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-muted-foreground">
                      {formatRelativeDate(result.updatedAt)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {result.wordCount} words
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {Math.round(result.rank * 100)}%
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
