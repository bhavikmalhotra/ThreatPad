'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { Toolbar } from './toolbar';
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
            <div
              className="preview-document prose prose-invert max-w-3xl w-full rounded-lg border border-border/50 bg-card/60 px-12 py-10 shadow-lg"
              dangerouslySetInnerHTML={{ __html: editor?.getHTML() || initialContent }}
            />
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
