import { useEffect, useRef, useState } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { useTheme } from '../context/ThemeContext';

interface CodeEditorProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  fullHeight?: boolean;
  onCursorChange?: (line: number, col: number) => void;
}

const monoFont = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

const normalTheme = EditorView.theme({
  '&': { fontSize: '13px' },
  '.cm-scroller': { fontFamily: monoFont, minHeight: '400px' },
  '.cm-content': { padding: '12px 0' },
  '.cm-line': { padding: '0 16px' },
  '.cm-gutters': { paddingLeft: '8px', paddingRight: '4px' },
});

const fullHeightTheme = EditorView.theme({
  '&': { fontSize: '13px', height: '100%' },
  '.cm-scroller': { fontFamily: monoFont, overflow: 'auto', height: '100%' },
  '.cm-content': { padding: '12px 0' },
  '.cm-line': { padding: '0 16px' },
  '.cm-gutters': { paddingLeft: '8px', paddingRight: '4px' },
});

export default function CodeEditor({ label, value, onChange, fullHeight, onCursorChange }: CodeEditorProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onCursorRef = useRef(onCursorChange);
  onCursorRef.current = onCursorChange;

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const currentDoc = viewRef.current ? viewRef.current.state.doc.toString() : value;

    const view = new EditorView({
      doc: currentDoc,
      extensions: [
        basicSetup,
        javascript({ typescript: true, jsx: true }),
        ...(theme === 'dark' ? [oneDark] : []),
        fullHeight ? fullHeightTheme : normalTheme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
          if (onCursorRef.current && (update.selectionSet || update.docChanged)) {
            const head = update.state.selection.main.head;
            const line = update.state.doc.lineAt(head);
            onCursorRef.current(line.number, head - line.from + 1);
          }
        }),
      ],
      parent: containerRef.current,
    });

    const old = viewRef.current;
    viewRef.current = view;
    if (old) old.destroy();

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [theme, fullHeight]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  function copyCode() {
    const text = viewRef.current?.state.doc.toString() ?? value;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (fullHeight) {
    return (
      <div
        ref={containerRef}
        className="h-full [&_.cm-editor]:h-full [&_.cm-editor]:outline-none [&_.cm-editor]:border-none [&_.cm-focused]:outline-none"
      />
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-[#252526] border-b border-gray-700">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-xs font-mono text-gray-200">{label}</span>
        </div>
        <button
          type="button"
          onClick={copyCode}
          className="text-xs text-gray-400 hover:text-gray-200 transition-colors px-2 py-0.5 rounded hover:bg-gray-700"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div
        ref={containerRef}
        className="[&_.cm-editor]:outline-none [&_.cm-editor]:border-none [&_.cm-focused]:outline-none"
      />
    </div>
  );
}
