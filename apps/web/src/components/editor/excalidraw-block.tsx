'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Node, mergeAttributes, ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import dynamic from 'next/dynamic';
import { PenTool, Maximize2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import '@excalidraw/excalidraw/index.css';

const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then((m) => m.Excalidraw),
  { ssr: false },
);

/** Renders a static SVG preview of drawing data (auto-fits content) */
function StaticDrawingPreview({ drawingData }: { drawingData: { elements: any[]; appState: any; files: any } }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !drawingData.elements.length) return;
    let cancelled = false;

    import('@excalidraw/excalidraw').then((mod) => {
      if (cancelled || !mod.exportToSvg) return;
      mod.exportToSvg({
        elements: drawingData.elements,
        appState: {
          ...drawingData.appState,
          theme: 'dark',
          exportBackground: true,
          viewBackgroundColor: 'transparent',
        },
        files: drawingData.files || null,
      }).then((svg: SVGSVGElement) => {
        if (cancelled || !containerRef.current) return;
        svg.style.width = '100%';
        svg.style.height = '100%';
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(svg);
      }).catch(() => {});
    });

    return () => { cancelled = true; };
  }, [drawingData]);

  return <div ref={containerRef} className="w-full h-full flex items-center justify-center" />;
}

function parseData(data: string) {
  if (!data) return { elements: [], appState: {}, files: {} };
  try {
    const parsed = JSON.parse(data);
    return {
      elements: parsed.elements || [],
      appState: parsed.appState || {},
      files: parsed.files || {},
    };
  } catch {
    return { elements: [], appState: {}, files: {} };
  }
}

function ExcalidrawBlockView({ node, updateAttributes, deleteNode, editor }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const drawingData = parseData(node.attrs.data);
  const hasContent = drawingData.elements.length > 0;
  const editorRef = useRef<any>(null);

  const handleSave = useCallback(() => {
    if (!editorRef.current) {
      setIsEditing(false);
      return;
    }
    const elements = editorRef.current.getSceneElements();
    const appState = editorRef.current.getAppState();
    const files = editorRef.current.getFiles();
    const data = JSON.stringify({
      elements,
      appState: {
        viewBackgroundColor: appState.viewBackgroundColor,
        gridSize: appState.gridSize,
      },
      files,
    });
    updateAttributes({ data });
    setIsEditing(false);
  }, [updateAttributes]);

  // Close modal on Escape
  useEffect(() => {
    if (!isEditing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isEditing, handleSave]);

  return (
    <NodeViewWrapper className="my-4 not-prose" data-type="excalidraw">
      {/* Inline preview card */}
      <div className="relative rounded-lg border border-border bg-card/50 overflow-hidden group">
        {/* Preview header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/80">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <PenTool className="h-3.5 w-3.5" />
            <span>Drawing Block</span>
          </div>
          {editor?.isEditable && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setIsEditing(true)}
              >
                <Maximize2 className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                onClick={deleteNode}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Preview area */}
        <div
          className="h-[300px] cursor-pointer flex items-center justify-center"
          onClick={() => editor?.isEditable && setIsEditing(true)}
        >
          {hasContent ? (
            <StaticDrawingPreview drawingData={drawingData} />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <PenTool className="h-8 w-8" />
              <span className="text-sm">Click to start drawing</span>
            </div>
          )}
        </div>
      </div>

      {/* Full-screen editing modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-background/95 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
            <div className="flex items-center gap-2 text-sm">
              <PenTool className="h-4 w-4" />
              <span>Edit Drawing</span>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
            >
              Done
            </Button>
          </div>
          <div className="flex-1">
            <Excalidraw
              excalidrawAPI={(api: any) => { editorRef.current = api; }}
              initialData={{
                elements: drawingData.elements,
                appState: { ...drawingData.appState, theme: 'dark' },
                files: drawingData.files,
              }}
              theme="dark"
            />
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}

export const ExcalidrawBlock = Node.create({
  name: 'excalidrawBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      data: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="excalidraw"]',
        getAttrs: (dom: HTMLElement) => ({
          data: dom.getAttribute('data-content') || '',
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'excalidraw',
        'data-content': HTMLAttributes.data || '',
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ExcalidrawBlockView);
  },
});
