'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Placeholder from '@tiptap/extension-placeholder';
import LinkExtension from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { common, createLowlight } from 'lowlight';
import { DOMSerializer } from '@tiptap/pm/model';
import { ExcalidrawBlock } from './excalidraw-block';
import { Toolbar } from './toolbar';
import '@excalidraw/excalidraw/index.css';

import { PresenceBar, type PresenceUser } from './presence-bar';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
const lowlight = createLowlight(common);

async function uploadImage(file: File, workspaceId: string): Promise<string> {
  const res = await api.upload<{ id: string; url: string }>(
    `/api/workspaces/${workspaceId}/uploads`,
    file,
  );
  const token = useAuthStore.getState().accessToken;
  return `${API_URL}${res.url}?token=${token}`;
}

/** Renders a static SVG of drawing data in preview mode */
function PreviewDrawingBlock({ data }: { data: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !data) return;
    let cancelled = false;
    let parsed: any;
    try { parsed = JSON.parse(data); } catch { return; }
    if (!parsed.elements?.length) return;

    import('@excalidraw/excalidraw').then((mod) => {
      if (cancelled || !mod.exportToSvg) return;
      mod.exportToSvg({
        elements: parsed.elements,
        appState: {
          ...(parsed.appState || {}),
          theme: 'dark',
          exportBackground: true,
          viewBackgroundColor: 'transparent',
        },
        files: parsed.files || null,
      }).then((svg: SVGSVGElement) => {
        if (cancelled || !containerRef.current) return;
        svg.style.width = '100%';
        svg.style.height = '100%';
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(svg);
      }).catch(() => {});
    });

    return () => { cancelled = true; };
  }, [data]);

  return (
    <div
      ref={containerRef}
      className="not-prose my-4 h-[350px] rounded-lg border border-border overflow-hidden flex items-center justify-center"
    />
  );
}

/** Builds the preview by rendering HTML segments and excalidraw blocks from editor JSON */
function PreviewContent({ editor, initialContent }: { editor: any; initialContent: string }) {
  if (!editor) {
    return (
      <div
        className="preview-document prose prose-invert max-w-3xl w-full rounded-lg border border-border/50 bg-card/60 px-12 py-10 shadow-lg"
        dangerouslySetInnerHTML={{ __html: initialContent }}
      />
    );
  }

  // Walk the editor JSON to split content into HTML segments and excalidraw blocks
  const json = editor.getJSON();
  const segments: { type: 'html' | 'excalidraw'; content: string }[] = [];
  let htmlNodes: any[] = [];

  const flushHtml = () => {
    if (htmlNodes.length === 0) return;
    // Generate HTML for accumulated non-excalidraw nodes using a temporary doc
    const tempDoc = { type: 'doc', content: htmlNodes };
    try {
      const html = editor.schema.nodeFromJSON(tempDoc);
      const div = document.createElement('div');
      const fragment = DOMSerializer.fromSchema(editor.schema).serializeFragment(html.content);
      div.appendChild(fragment);
      segments.push({ type: 'html', content: div.innerHTML });
    } catch {
      // Fallback: use getHTML for the whole doc
    }
    htmlNodes = [];
  };

  if (json.content) {
    for (const node of json.content) {
      if (node.type === 'excalidrawBlock') {
        flushHtml();
        segments.push({ type: 'excalidraw', content: node.attrs?.data || '' });
      } else {
        htmlNodes.push(node);
      }
    }
    flushHtml();
  }

  // Fallback: if segment extraction failed, show plain HTML
  if (segments.length === 0) {
    return (
      <div
        className="preview-document prose prose-invert max-w-3xl w-full rounded-lg border border-border/50 bg-card/60 px-12 py-10 shadow-lg"
        dangerouslySetInnerHTML={{ __html: editor.getHTML() }}
      />
    );
  }

  return (
    <div className="preview-document prose prose-invert max-w-3xl w-full rounded-lg border border-border/50 bg-card/60 px-12 py-10 shadow-lg">
      {segments.map((seg, i) =>
        seg.type === 'excalidraw' ? (
          <PreviewDrawingBlock key={i} data={seg.content} />
        ) : (
          <div key={i} dangerouslySetInnerHTML={{ __html: seg.content }} />
        ),
      )}
    </div>
  );
}

interface NoteEditorProps {
  initialContent?: string;
  workspaceId?: string;
  presenceUsers?: PresenceUser[];
  editable?: boolean;
  onUpdate?: (content: string) => void;
}

export function NoteEditor({
  initialContent = '',
  workspaceId,
  presenceUsers = [],
  editable = true,
  onUpdate,
}: NoteEditorProps) {
  const [wordCount, setWordCount] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({
        placeholder: 'Start writing your threat intelligence...',
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline cursor-pointer' },
      }),
      Image.configure({ inline: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      ExcalidrawBlock,
    ],
    content: initialContent,
    editable,
    editorProps: {
      attributes: {
        class:
          'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[500px] px-8 py-6',
      },
      handleDrop(view, event) {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        const file = files[0];
        if (!file || !file.type.startsWith('image/')) return false;
        if (!workspaceId) return false;
        event.preventDefault();
        uploadImage(file, workspaceId).then((src) => {
          const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
          const imageNode = view.state.schema.nodes.image;
          if (pos && imageNode) {
            const node = imageNode.create({ src });
            const tr = view.state.tr.insert(pos.pos, node);
            view.dispatch(tr);
          }
        }).catch((err) => console.error('Image upload failed:', err));
        return true;
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (!file || !workspaceId) return false;
            event.preventDefault();
            uploadImage(file, workspaceId).then((src) => {
              const imageNode = view.state.schema.nodes.image;
              if (!imageNode) return;
              const node = imageNode.create({ src });
              const tr = view.state.tr.replaceSelectionWith(node);
              view.dispatch(tr);
            }).catch((err) => console.error('Image upload failed:', err));
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      const text = e.getText();
      const words = text
        .split(/\s+/)
        .filter((w) => w.length > 0).length;
      setWordCount(words);
      onUpdate?.(e.getHTML());
    },
  });

  // Update content when initialContent changes
  useEffect(() => {
    if (editor && initialContent && !editor.isDestroyed) {
      const currentContent = editor.getHTML();
      if (currentContent !== initialContent) {
        editor.commands.setContent(initialContent, { emitUpdate: false });
      }
    }
  }, [editor, initialContent]);

  const handleAutoSave = useCallback(() => {
    if (!editor) return;
    // Debounced auto-save will be handled by the parent component
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const timeout = setTimeout(handleAutoSave, 1000);
    return () => clearTimeout(timeout);
  }, [editor, handleAutoSave]);

  return (
    <div className="flex flex-col h-full">
      <PresenceBar users={presenceUsers} />
      <div className="flex items-center border-b border-border">
        {!previewMode && <div className="flex-1"><Toolbar editor={editor} workspaceId={workspaceId} /></div>}
        {previewMode && <div className="flex-1" />}
        <div className="flex items-center gap-0.5 px-3 py-1.5 shrink-0">
          <button
            onClick={() => setPreviewMode(false)}
            className={cn(
              'px-3 py-1 text-xs rounded-md transition-colors',
              !previewMode
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            Edit
          </button>
          <button
            onClick={() => setPreviewMode(true)}
            className={cn(
              'px-3 py-1 text-xs rounded-md transition-colors',
              previewMode
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            Preview
          </button>
        </div>
      </div>
      <div className={cn(
        "flex-1 overflow-auto",
        previewMode ? "bg-[#0d0d14]" : "bg-background",
      )}>
        {previewMode ? (
          <div className="flex justify-center py-10 px-4">
            <PreviewContent editor={editor} initialContent={initialContent} />
          </div>
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-1.5 text-xs text-muted-foreground bg-card/50">
        <span>{wordCount} words</span>
        <span>
          {previewMode ? 'Preview' : editable ? 'Editing' : 'View only'}
          {presenceUsers.length > 0 && ` · ${presenceUsers.length} online`}
        </span>
      </div>
    </div>
  );
}
