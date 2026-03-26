# Fix Tag Sidebar Refresh & Tag Filtering

## Tasks
- [x] 1. Dispatch `threatpad:refresh-tags` after adding, removing, or creating tags in note editor
- [x] 2. Navigate to workspace page with `?tags=` param when toggling tags in sidebar
- [x] 3. Filter notes by selected tags on the workspace page

## Review

### Files Modified (3)

1. **`apps/web/.../note/[noteId]/page.tsx`** — added `window.dispatchEvent(new CustomEvent('threatpad:refresh-tags'))` to `handleAddTag`, `handleRemoveTag`, and `handleCreateTag`

2. **`apps/web/src/app/(app)/layout.tsx`** — `handleTagToggle` now navigates to `/workspace/{id}?tags={ids}` so the workspace page knows which tags are selected

3. **`apps/web/.../workspace/[workspaceId]/page.tsx`** — reads `tags` from URL search params, filters notes to show only those matching any selected tag (OR logic)
