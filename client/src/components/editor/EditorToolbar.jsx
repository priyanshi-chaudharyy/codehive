import {
  Play,
  Save,
  Copy,
  Share2,
  ChevronDown,
  Users,
  History,
  Code,
  Keyboard,
} from 'lucide-react';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', icon: 'JS' },
  { id: 'typescript', label: 'TypeScript', icon: 'TS' },
  { id: 'python', label: 'Python', icon: 'PY' },
  { id: 'java', label: 'Java', icon: 'JV' },
  { id: 'cpp', label: 'C++', icon: 'C+' },
  { id: 'c', label: 'C', icon: 'C' },
  { id: 'csharp', label: 'C#', icon: 'C#' },
  { id: 'go', label: 'Go', icon: 'GO' },
  { id: 'rust', label: 'Rust', icon: 'RS' },
  { id: 'ruby', label: 'Ruby', icon: 'RB' },
  { id: 'php', label: 'PHP', icon: 'PH' },
  { id: 'swift', label: 'Swift', icon: 'SW' },
  { id: 'kotlin', label: 'Kotlin', icon: 'KT' },
];

/**
 * Editor toolbar with language selector, run button, and actions.
 */
const EditorToolbar = ({
  language,
  onLanguageChange,
  onRun,
  onSave,
  onOpenSnapshots,
  onCopyLink,
  onShareSnippet,
  isExecuting,
  usersCount = 0,
}) => {
  return (
    <div className="flex items-center justify-between px-2 sm:px-4 py-2 bg-surface-900/80 border-b border-surface-800/50 gap-2 overflow-x-auto">
      {/* Left — Language selector */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="relative">
          <select
            id="language-selector"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="appearance-none bg-surface-800 border border-surface-700 rounded-lg px-3 py-1.5 pr-8 text-sm text-surface-200 focus:outline-none focus:border-hive-500 cursor-pointer"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"
          />
        </div>

        {/* Users count */}
        {usersCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-surface-400">
            <Users size={14} />
            <span>{usersCount} online</span>
          </div>
        )}
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button
          id="btn-share-snippet"
          onClick={onShareSnippet}
          className="btn-ghost !px-2.5 !py-1.5 text-xs flex items-center gap-1.5"
          title="Share selected code as snippet in chat (Ctrl+Shift+S)"
        >
          <Code size={14} />
          <span className="hidden sm:inline">Snippet</span>
        </button>

        <button
          id="btn-copy-link"
          onClick={onCopyLink}
          className="btn-ghost !px-2.5 !py-1.5 text-xs flex items-center gap-1.5"
          title="Copy room link"
        >
          <Share2 size={14} />
          <span className="hidden sm:inline">Share</span>
        </button>

        <button
          id="btn-save"
          onClick={onSave}
          className="btn-ghost !px-2.5 !py-1.5 text-xs flex items-center gap-1.5"
          title="Save snapshot (Ctrl+S)"
        >
          <Save size={14} />
          <span className="hidden sm:inline">Save</span>
        </button>

        <button
          id="btn-snapshots"
          onClick={onOpenSnapshots}
          className="btn-ghost !px-2.5 !py-1.5 text-xs flex items-center gap-1.5"
          title="View snapshots"
        >
          <History size={14} />
          <span className="hidden sm:inline">Snapshots</span>
        </button>

        <button
          id="btn-run-code"
          onClick={onRun}
          disabled={isExecuting}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium
                     bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200 text-white"
          title="Run code (Ctrl+Enter)"
        >
          <Play size={14} fill="currentColor" />
          {isExecuting ? 'Running...' : 'Run'}
        </button>
      </div>
    </div>
  );
};

export { LANGUAGES };
export default EditorToolbar;
