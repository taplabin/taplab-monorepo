import { useState } from 'react';
import { useJob } from '../context/JobContext';
import CodeEditor from '../components/CodeEditor';
import MaterialsGallery from '../components/MaterialsGallery';
import ImageUploadHelper from '../components/ImageUploadHelper';

function FileTab({
  path,
  active,
  dirty,
  onClick,
}: {
  path: string;
  active: boolean;
  dirty: boolean;
  onClick: () => void;
}) {
  const name = path.split('/').pop()!;
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 h-full text-xs font-mono border-r border-gray-200 dark:border-[#2d2d2d] transition-colors flex-shrink-0 ${
        active
          ? 'bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 border-t-2 border-t-[#2087e6]'
          : 'bg-gray-100 dark:bg-[#2d2d2d] text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border-t-2 border-t-transparent'
      }`}
    >
      <FileIcon ext={name.split('.').pop() ?? ''} />
      {path}
      {dirty && (
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0 ml-0.5" />
      )}
    </button>
  );
}

function FileIcon({ ext }: { ext: string }) {
  const color = ext === 'tsx' ? 'text-blue-400' : 'text-yellow-400';
  return (
    <svg className={`w-3 h-3 flex-shrink-0 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

export default function Editor() {
  const { slug, job, appTsx, contentTs, setAppTsx, setContentTs, validationResult, validationNeeded } = useJob();

  const [activeFile, setActiveFile] = useState<'app' | 'content'>('app');
  const [isSplit, setIsSplit] = useState(false);
  const [panelOpen, setPanelOpen] = useState(() => {
    return localStorage.getItem('dev-materials-panel-open') !== 'false';
  });
  const [cursor, setCursor] = useState({ line: 1, col: 1 });

  function togglePanel() {
    setPanelOpen(prev => {
      localStorage.setItem('dev-materials-panel-open', String(!prev));
      return !prev;
    });
  }

  const errorCount = validationResult?.errors.length ?? 0;
  const warnCount = validationResult?.warnings.length ?? 0;

  function statusLabel() {
    if (validationResult === null) {
      if (!appTsx.trim() && !contentTs.trim()) return { text: 'No code yet', color: 'text-white/50' };
      return { text: 'Not validated', color: 'text-white/70' };
    }
    if (validationResult.passed) return { text: '✓ Validated', color: 'text-emerald-300' };
    return {
      text: `● ${errorCount} error${errorCount !== 1 ? 's' : ''}${warnCount > 0 ? `, ${warnCount} warning${warnCount !== 1 ? 's' : ''}` : ''}`,
      color: 'text-red-300',
    };
  }

  const { text: statusText, color: statusColor } = statusLabel();

  return (
    <div className="h-full flex overflow-hidden bg-white dark:bg-[#1e1e1e]">

      {/* Left panel — materials */}
      <div className={`flex-shrink-0 border-r border-gray-200 dark:border-[#2d2d2d] flex flex-col bg-gray-50 dark:bg-[#252526] transition-[width] duration-200 overflow-hidden ${panelOpen ? 'w-[260px]' : 'w-10'}`}>
        <button
          onClick={togglePanel}
          className="h-9 flex-shrink-0 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title={panelOpen ? 'Close panel' : 'Open materials'}
        >
          <FolderIcon open={panelOpen} />
        </button>
        {panelOpen && (
          <div className="flex-1 overflow-y-auto p-3 space-y-5">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Materials</p>
              <MaterialsGallery materials={job?.materials ?? []} notes={job?.materialsNotes ?? null} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Upload to R2</p>
              <ImageUploadHelper slug={slug} />
            </div>
          </div>
        )}
      </div>

      {/* Main editor area */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* File tab bar */}
        <div className="flex-shrink-0 h-9 flex items-stretch bg-gray-100 dark:bg-[#252526] border-b border-gray-200 dark:border-[#2d2d2d] overflow-hidden">
          <FileTab
            path="src/App.tsx"
            active={!isSplit && activeFile === 'app'}
            dirty={validationNeeded && appTsx.trim() !== ''}
            onClick={() => { setActiveFile('app'); setIsSplit(false); }}
          />
          <FileTab
            path="src/content.ts"
            active={!isSplit && activeFile === 'content'}
            dirty={validationNeeded && contentTs.trim() !== ''}
            onClick={() => { setActiveFile('content'); setIsSplit(false); }}
          />
          <div className="flex-1" />
          <button
            onClick={() => setIsSplit(s => !s)}
            title="Toggle split view"
            className={`px-3 h-full flex items-center gap-1.5 text-xs border-l border-gray-200 dark:border-[#2d2d2d] flex-shrink-0 transition-colors ${
              isSplit
                ? 'text-[#2087e6] dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <SplitIcon />
            Split
          </button>
        </div>

        {/* Editors */}
        <div className="flex-1 overflow-hidden flex">
          {isSplit ? (
            <>
              {/* App.tsx pane */}
              <div className="flex-1 overflow-hidden flex flex-col border-r border-gray-200 dark:border-[#2d2d2d]">
                <div className="flex-shrink-0 h-6 px-3 flex items-center bg-gray-50 dark:bg-[#1e1e1e] border-b border-gray-200 dark:border-[#2d2d2d]">
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">src/App.tsx</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <CodeEditor label="App.tsx" value={appTsx} onChange={setAppTsx} fullHeight />
                </div>
              </div>
              {/* content.ts pane */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-shrink-0 h-6 px-3 flex items-center bg-gray-50 dark:bg-[#1e1e1e] border-b border-gray-200 dark:border-[#2d2d2d]">
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">src/content.ts</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <CodeEditor label="content.ts" value={contentTs} onChange={setContentTs} fullHeight />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-hidden">
              {activeFile === 'app' ? (
                <CodeEditor
                  label="App.tsx"
                  value={appTsx}
                  onChange={setAppTsx}
                  fullHeight
                  onCursorChange={(l, c) => setCursor({ line: l, col: c })}
                />
              ) : (
                <CodeEditor
                  label="content.ts"
                  value={contentTs}
                  onChange={setContentTs}
                  fullHeight
                  onCursorChange={(l, c) => setCursor({ line: l, col: c })}
                />
              )}
            </div>
          )}
        </div>

        {/* Status bar — VS Code blue */}
        <div className="flex-shrink-0 h-[22px] flex items-center px-3 gap-4 bg-[#007acc] text-white text-[11px] select-none">
          <span className={statusColor}>{statusText}</span>
          <div className="flex-1" />
          {!isSplit && (
            <span className="text-white/70">Ln {cursor.line}, Col {cursor.col}</span>
          )}
          <span className="text-white/60">
            {activeFile === 'app' ? 'TypeScript React' : 'TypeScript'}
          </span>
        </div>

      </div>
    </div>
  );
}

function FolderIcon({ open }: { open: boolean }) {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      )}
    </svg>
  );
}

function SplitIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h4M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M12 3v18" />
    </svg>
  );
}
