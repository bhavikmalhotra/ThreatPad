'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import '@excalidraw/excalidraw/index.css';

const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then((m) => m.Excalidraw),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

interface DrawingEditorProps {
  initialContent: string;
  onUpdate: (content: string) => void;
  editable: boolean;
}

function parseDrawingData(content: string) {
  if (!content) return { elements: [], appState: {}, files: {} };
  try {
    const parsed = JSON.parse(content);
    return {
      elements: parsed.elements || [],
      appState: parsed.appState || {},
      files: parsed.files || {},
    };
  } catch {
    return { elements: [], appState: {}, files: {} };
  }
}

export function DrawingEditor({ initialContent, onUpdate, editable }: DrawingEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [initialData] = useState(() => parseDrawingData(initialContent));
  const isInitialLoadRef = useRef(true);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      // Skip the initial onChange that Excalidraw fires on mount
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        return;
      }

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        // Only store minimal appState (view-related, not UI state)
        const minimalAppState = {
          viewBackgroundColor: appState.viewBackgroundColor,
          gridSize: appState.gridSize,
        };
        const data = JSON.stringify({
          elements,
          appState: minimalAppState,
          files,
        });
        onUpdate(data);
      }, 2000);
    },
    [onUpdate],
  );

  return (
    <div className="absolute inset-0">
      <Excalidraw
        initialData={{
          elements: initialData.elements,
          appState: {
            ...initialData.appState,
            theme: 'dark',
          },
          files: initialData.files,
        }}
        onChange={handleChange}
        viewModeEnabled={!editable}
        theme="dark"
      />
    </div>
  );
}
