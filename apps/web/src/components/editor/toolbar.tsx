'use client';

import { useRef } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Minus,
  Link,
  Table,
  Highlighter,
  Undo,
  Redo,
  CodeSquare,
  ImagePlus,
  PenTool,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

interface ToolbarProps {
  editor: Editor | null;
  workspaceId?: string;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  icon: React.ElementType;
  label: string;
  shortcut?: string;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  icon: Icon,
  label,
  shortcut,
}: ToolbarButtonProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7',
              isActive && 'bg-accent text-accent-foreground',
            )}
            onClick={onClick}
            disabled={disabled}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <span>{label}</span>
          {shortcut && (
            <span className="ml-2 text-muted-foreground">{shortcut}</span>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function Toolbar({ editor, workspaceId }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!editor) return null;

  const handleImageUpload = async (file: File) => {
    if (!workspaceId) return;
    try {
      const res = await api.upload<{ id: string; url: string }>(
        `/api/workspaces/${workspaceId}/uploads`,
        file,
      );
      const token = useAuthStore.getState().accessToken;
      const src = `${API_URL}${res.url}?token=${token}`;
      editor.chain().focus().setImage({ src }).run();
    } catch (err) {
      console.error('Image upload failed:', err);
    }
  };

  return (
    <div className="flex items-center gap-0.5 border-b border-border bg-card px-2 py-1 flex-wrap">
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        icon={Undo}
        label="Undo"
        shortcut="Ctrl+Z"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        icon={Redo}
        label="Redo"
        shortcut="Ctrl+Shift+Z"
      />

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        icon={Heading1}
        label="Heading 1"
        shortcut="Ctrl+Alt+1"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        icon={Heading2}
        label="Heading 2"
        shortcut="Ctrl+Alt+2"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        icon={Heading3}
        label="Heading 3"
        shortcut="Ctrl+Alt+3"
      />

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        icon={Bold}
        label="Bold"
        shortcut="Ctrl+B"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        icon={Italic}
        label="Italic"
        shortcut="Ctrl+I"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        icon={Strikethrough}
        label="Strikethrough"
        shortcut="Ctrl+Shift+X"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        icon={Code}
        label="Inline Code"
        shortcut="Ctrl+E"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        isActive={editor.isActive('highlight')}
        icon={Highlighter}
        label="Highlight"
      />

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        icon={List}
        label="Bullet List"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        icon={ListOrdered}
        label="Ordered List"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        isActive={editor.isActive('taskList')}
        icon={ListTodo}
        label="Task List"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        icon={Quote}
        label="Quote"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        icon={Minus}
        label="Horizontal Rule"
      />

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive('codeBlock')}
        icon={CodeSquare}
        label="Code Block"
      />
      <ToolbarButton
        onClick={() => {
          const url = window.prompt('Enter URL:');
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
        isActive={editor.isActive('link')}
        icon={Link}
        label="Link"
        shortcut="Ctrl+K"
      />
      <ToolbarButton
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
        icon={Table}
        label="Insert Table"
      />

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarButton
        onClick={() => fileInputRef.current?.click()}
        icon={ImagePlus}
        label="Insert Image"
        disabled={!workspaceId}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().insertContent({ type: 'excalidrawBlock', attrs: { data: '' } }).run()}
        icon={PenTool}
        label="Insert Drawing"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageUpload(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
