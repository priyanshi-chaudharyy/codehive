import { X } from 'lucide-react';
import { getLanguageFromName } from './FileExplorer';

const FILE_ICONS = {
  javascript: '🟨',
  typescript: '🔷',
  python: '🐍',
  java: '☕',
  cpp: '⚙️',
  c: '©️',
  go: '🐹',
  rust: '🦀',
  ruby: '💎',
  php: '🐘',
  default: '📄',
};

const getFileIcon = (name) => {
  const lang = getLanguageFromName(name);
  return FILE_ICONS[lang] || FILE_ICONS['default'];
};

/**
 * Renders multiple file tabs like VS Code.
 */
const EditorTabs = ({ files = {}, openTabs = [], activeFileId, onSelectTab, onCloseTab }) => {
  if (openTabs.length === 0) return null;

  return (
    <div className="flex bg-surface-900 border-b border-surface-800/50 overflow-x-auto shrink-0 scrollbar-hide">
      {openTabs.map((fileId) => {
        const file = files[fileId];
        if (!file) return null;

        const isActive = activeFileId === fileId;

        return (
          <div
            key={fileId}
            onClick={() => onSelectTab(fileId)}
            className={`group flex items-center gap-2 px-3 py-2 min-w-[120px] max-w-[200px] border-r border-surface-800/50 cursor-pointer select-none transition-colors
              ${isActive ? 'bg-surface-950 text-surface-200 border-t-2 border-t-hive-500' : 'bg-surface-900 text-surface-500 hover:bg-surface-800'}`}
          >
            <span className="text-xs shrink-0">{getFileIcon(file.name)}</span>
            <span className={`text-[13px] truncate flex-1 ${isActive ? 'font-medium' : ''}`}>
              {file.name}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(fileId);
              }}
              className={`p-0.5 rounded-md hover:bg-surface-700 transition-colors shrink-0
                ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              title="Close (Alt+W)"
            >
              <X size={14} className={isActive ? 'text-surface-400' : 'text-surface-500'} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default EditorTabs;
