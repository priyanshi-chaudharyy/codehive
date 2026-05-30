import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, File, FolderOpen, Folder, Plus, Trash2, FileCode, FilePlus } from 'lucide-react';

/**
 * Virtual file system explorer for the collaborative editor.
 * 
 * Files are stored as a flat map with parentId references.
 * The tree is built from this flat structure.
 */

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
  if (!name) return FILE_ICONS['default'];
  const ext = name.split('.').pop()?.toLowerCase();
  const map = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', java: 'java', cpp: 'cpp', c: 'c', go: 'go', rs: 'rust', rb: 'ruby', php: 'php' };
  return FILE_ICONS[map[ext] || 'default'];
};

const getLanguageFromName = (name) => {
  if (!name) return 'javascript';
  const ext = name.split('.').pop()?.toLowerCase();
  const map = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', java: 'java', cpp: 'cpp', c: 'c', go: 'go', rs: 'rust', rb: 'ruby', php: 'php', cs: 'csharp', kt: 'kotlin', swift: 'swift' };
  return map[ext] || 'javascript';
};

const TreeItem = ({ item, depth = 0, activeFileId, onSelect, onDelete, onRename, isCollapsed, onToggle }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);

  const handleRename = () => {
    if (editName.trim() && editName !== item.name) {
      onRename(item.id, editName.trim());
    }
    setIsEditing(false);
  };

  const isActive = item.id === activeFileId;
  const isFolder = item.type === 'folder';

  return (
    <div className="select-none">
      <div
        className={`group flex items-center gap-1 px-2 py-[5px] cursor-pointer text-[13px] rounded-md mx-1 transition-all duration-150
          ${isActive ? 'bg-hive-600/20 text-hive-300' : 'text-surface-400 hover:bg-surface-800/60 hover:text-surface-200'}`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => isFolder ? onToggle(item.id) : onSelect(item.id)}
        onDoubleClick={() => { setEditName(item.name); setIsEditing(true); }}
      >
        {/* Folder chevron or file indent */}
        {isFolder ? (
          isCollapsed ? <ChevronRight size={14} className="shrink-0 text-surface-500" /> : <ChevronDown size={14} className="shrink-0 text-surface-500" />
        ) : (
          <span className="w-[14px] shrink-0" />
        )}

        {/* Icon */}
        {isFolder ? (
          isCollapsed ? <Folder size={14} className="shrink-0 text-honey-500/70" /> : <FolderOpen size={14} className="shrink-0 text-honey-400" />
        ) : (
          <span className="text-[12px] shrink-0">{getFileIcon(item.name)}</span>
        )}

        {/* Name */}
        {isEditing ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            className="flex-1 bg-surface-800 border border-hive-500 rounded px-1 py-0 text-[12px] text-white outline-none min-w-0"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate">{item.name}</span>
        )}

        {/* Delete button — appears on hover */}
        <button
          className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/20 text-surface-500 hover:text-red-400 transition-all shrink-0"
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

const FileExplorer = ({ files = {}, activeFileId, onSelectFile, onCreateFile, onCreateFolder, onDeleteFile, onRenameFile }) => {
  const [collapsed, setCollapsed] = useState({});
  const [isCreating, setIsCreating] = useState(null); // 'file' | 'folder' | null
  const [newName, setNewName] = useState('');

  const toggleFolder = (id) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Build tree from flat file map
  const tree = useMemo(() => {
    const items = Object.entries(files).map(([id, f]) => ({ id, ...f }));
    const roots = items.filter(f => !f.parentId).sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });

    const getChildren = (parentId) => {
      return items
        .filter(f => f.parentId === parentId)
        .sort((a, b) => {
          if (a.type === 'folder' && b.type !== 'folder') return -1;
          if (a.type !== 'folder' && b.type === 'folder') return 1;
          return a.name.localeCompare(b.name);
        });
    };

    const renderTree = (nodes, depth = 0) => {
      return nodes.map(item => (
        <div key={item.id}>
          <TreeItem
            item={item}
            depth={depth}
            activeFileId={activeFileId}
            onSelect={onSelectFile}
            onDelete={onDeleteFile}
            onRename={onRenameFile}
            isCollapsed={collapsed[item.id]}
            onToggle={toggleFolder}
          />
          {item.type === 'folder' && !collapsed[item.id] && (
            <div>{renderTree(getChildren(item.id), depth + 1)}</div>
          )}
        </div>
      ));
    };

    return renderTree(roots);
  }, [files, activeFileId, collapsed, onSelectFile, onDeleteFile, onRenameFile]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    if (isCreating === 'file') {
      onCreateFile(newName.trim(), null);
    } else {
      onCreateFolder(newName.trim(), null);
    }
    setNewName('');
    setIsCreating(null);
  };

  return (
    <div className="flex flex-col h-full bg-surface-950/80 border-r border-surface-800/50">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-800/50">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">Explorer</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setIsCreating('file'); setNewName('untitled.js'); }}
            className="p-1 rounded hover:bg-surface-800 text-surface-500 hover:text-surface-200 transition-colors"
            title="New File"
          >
            <FilePlus size={14} />
          </button>
          <button
            onClick={() => { setIsCreating('folder'); setNewName('new-folder'); }}
            className="p-1 rounded hover:bg-surface-800 text-surface-500 hover:text-surface-200 transition-colors"
            title="New Folder"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Create input */}
      {isCreating && (
        <div className="px-3 py-2 border-b border-surface-800/50">
          <div className="flex items-center gap-1.5">
            {isCreating === 'folder' ? <Folder size={12} className="text-honey-500 shrink-0" /> : <FileCode size={12} className="text-hive-400 shrink-0" />}
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleCreate}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') setIsCreating(null);
              }}
              className="flex-1 bg-surface-800 border border-hive-500 rounded px-2 py-1 text-[12px] text-white outline-none min-w-0"
              placeholder={isCreating === 'file' ? 'filename.js' : 'folder-name'}
            />
          </div>
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {Object.keys(files).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-surface-600 text-xs px-4 text-center gap-2">
            <FileCode size={24} className="text-surface-700" />
            <p>No files yet</p>
            <button
              onClick={() => { setIsCreating('file'); setNewName('index.js'); }}
              className="text-[11px] text-hive-400 hover:underline"
            >
              Create your first file
            </button>
          </div>
        ) : (
          tree
        )}
      </div>
    </div>
  );
};

export { getLanguageFromName };
export default FileExplorer;
