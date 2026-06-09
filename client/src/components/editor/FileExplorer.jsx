import { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, File, FolderOpen, Folder, Plus, Trash2, FileCode, FilePlus, Edit2 } from 'lucide-react';

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

/**
 * Presence dots component — shows colored dots for users editing a file.
 */
const PresenceDots = ({ users = [] }) => {
  if (users.length === 0) return null;

  const displayUsers = users.slice(0, 3);
  const remaining = users.length - 3;
  const tooltip = users.map(u => u.userName).join(', ');

  return (
    <div className="flex items-center gap-0.5 ml-auto shrink-0" title={tooltip}>
      {displayUsers.map((u, i) => (
        <div
          key={u.userId || i}
          className="w-[6px] h-[6px] rounded-full ring-1 ring-surface-900 animate-pulse"
          style={{ backgroundColor: u.color, animationDelay: `${i * 200}ms` }}
        />
      ))}
      {remaining > 0 && (
        <span className="text-[8px] text-surface-500 ml-0.5">+{remaining}</span>
      )}
    </div>
  );
};

const TreeItem = ({ item, depth = 0, activeFileId, selectedFolderId, onSelect, onSelectFolder, onDelete, onRename, isCollapsed, onToggle, activeUsers = [], onContextMenu, onMoveFile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleRename = () => {
    if (editName.trim() && editName !== item.name) {
      onRename(item.id, editName.trim());
    }
    setIsEditing(false);
  };

  const isActive = item.id === activeFileId;
  const isSelectedFolder = item.id === selectedFolderId;
  const isFolder = item.type === 'folder';

  return (
    <div className="select-none">
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('codehive/item-id', item.id);
          e.stopPropagation();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isFolder) setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          setIsDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          const draggedId = e.dataTransfer.getData('codehive/item-id');
          if (draggedId && draggedId !== item.id) {
            onMoveFile(draggedId, isFolder ? item.id : item.parentId);
          }
        }}
        className={`group flex items-center gap-1 px-2 py-[5px] cursor-pointer text-[13px] rounded-md mx-1 transition-all duration-150
          ${isDragOver ? 'bg-hive-500/30 ring-1 ring-hive-500' : ''}
          ${isActive ? 'bg-hive-600/20 text-hive-300' : isSelectedFolder ? 'bg-surface-700/50 text-surface-200' : 'text-surface-400 hover:bg-surface-800/60 hover:text-surface-200'}`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={(e) => {
          e.stopPropagation();
          if (isFolder) {
            onSelectFolder(item.id);
            onToggle(item.id);
          } else {
            onSelectFolder(item.parentId);
            onSelect(item.id);
          }
        }}
        onDoubleClick={() => { setEditName(item.name); setIsEditing(true); }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(e, item, () => { setEditName(item.name); setIsEditing(true); });
        }}
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

        {/* Presence dots — users editing this file */}
        <PresenceDots users={activeUsers} />

        {/* Delete button — appears on hover */}
        <button
          className={`${activeUsers.length > 0 ? 'ml-1' : 'ml-auto'} opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/20 text-surface-500 hover:text-red-400 transition-all shrink-0`}
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

const FileExplorer = ({ files = {}, activeFileId, onSelectFile, onCreateFile, onCreateFolder, onDeleteFile, onRenameFile, onMoveFile, userActiveFiles = {} }) => {
  const [collapsed, setCollapsed] = useState({});
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [isCreating, setIsCreating] = useState(null); // 'file' | 'folder' | null
  const [creatingParentId, setCreatingParentId] = useState(null);
  const [newName, setNewName] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleContextMenu = (e, item, triggerRename) => {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item,
      triggerRename
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    // Internal drag and drop
    const draggedId = e.dataTransfer.getData('codehive/item-id');
    if (draggedId) {
      onMoveFile(draggedId, null);
      return;
    }

    // External file drop
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          onCreateFile(file.name, null, event.target.result);
        };
        reader.readAsText(file);
      });
    }
  };

  const toggleFolder = (id) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Build a lookup: fileId -> [{ userId, userName, color }]
  const filePresence = useMemo(() => {
    const map = {};
    Object.entries(userActiveFiles).forEach(([userId, info]) => {
      if (info.fileId) {
        if (!map[info.fileId]) map[info.fileId] = [];
        map[info.fileId].push({ userId, userName: info.userName, color: info.color });
      }
    });
    return map;
  }, [userActiveFiles]);

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

    // Aggregate presence for folders (all users in descendant files)
    const getFolderPresence = (folderId) => {
      const users = [];
      const seen = new Set();
      const collect = (parentId) => {
        items.filter(f => f.parentId === parentId).forEach(child => {
          if (child.type === 'file' && filePresence[child.id]) {
            filePresence[child.id].forEach(u => {
              if (!seen.has(u.userId)) {
                seen.add(u.userId);
                users.push(u);
              }
            });
          } else if (child.type === 'folder') {
            collect(child.id);
          }
        });
      };
      collect(folderId);
      return users;
    };

    const renderTree = (nodes, depth = 0) => {
      return nodes.map(item => {
        const activeUsers = item.type === 'folder'
          ? getFolderPresence(item.id)
          : (filePresence[item.id] || []);

        return (
          <div key={item.id}>
            <TreeItem
              item={item}
              depth={depth}
              activeFileId={activeFileId}
              selectedFolderId={selectedFolderId}
              onSelect={onSelectFile}
              onSelectFolder={setSelectedFolderId}
              onDelete={onDeleteFile}
              onRename={onRenameFile}
              onMoveFile={onMoveFile}
              isCollapsed={collapsed[item.id]}
              onToggle={toggleFolder}
              activeUsers={activeUsers}
              onContextMenu={handleContextMenu}
            />
            {item.type === 'folder' && !collapsed[item.id] && (
              <div>{renderTree(getChildren(item.id), depth + 1)}</div>
            )}
          </div>
        );
      });
    };

    return renderTree(roots);
  }, [files, activeFileId, collapsed, onSelectFile, onDeleteFile, onRenameFile, filePresence]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    if (isCreating === 'file') {
      onCreateFile(newName.trim(), creatingParentId);
    } else {
      onCreateFolder(newName.trim(), creatingParentId);
    }
    setNewName('');
    setIsCreating(null);
  };

  return (
    <div 
      className={`flex flex-col h-full border-r border-surface-800/50 transition-colors relative ${isDragging ? 'bg-hive-900/20' : 'bg-surface-950/80'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => setSelectedFolderId(null)}
      onContextMenu={(e) => {
        // Prevent default on the empty space too
        e.preventDefault();
      }}
    >
      {isDragging && (
        <div className="absolute inset-0 z-10 border-2 border-hive-500 border-dashed m-2 rounded-lg pointer-events-none flex items-center justify-center bg-surface-950/50 backdrop-blur-sm">
          <div className="text-hive-400 font-medium flex flex-col items-center gap-2">
            <FilePlus size={32} />
            <span>Drop files to upload</span>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-800/50">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">Explorer</span>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setIsCreating('file'); setCreatingParentId(selectedFolderId); setNewName('untitled.js'); }}
            className="p-1 rounded hover:bg-surface-800 text-surface-500 hover:text-surface-200 transition-colors"
            title="New File"
          >
            <FilePlus size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIsCreating('folder'); setCreatingParentId(selectedFolderId); setNewName('new-folder'); }}
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

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-surface-800 border border-surface-700 shadow-xl rounded-md py-1 min-w-[150px] animate-fade-in text-[13px] text-surface-200"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.item.type === 'folder' && (
            <>
              <button 
                className="w-full text-left px-3 py-1.5 hover:bg-surface-700 hover:text-white flex items-center gap-2"
                onClick={() => { 
                  setIsCreating('file'); 
                  setCreatingParentId(contextMenu.item.id); 
                  setSelectedFolderId(contextMenu.item.id);
                  if (collapsed[contextMenu.item.id]) toggleFolder(contextMenu.item.id);
                  setNewName('untitled.js');
                  setContextMenu(null); 
                }}
              >
                <FilePlus size={14} className="text-surface-400" />
                New File
              </button>
              <button 
                className="w-full text-left px-3 py-1.5 hover:bg-surface-700 hover:text-white flex items-center gap-2"
                onClick={() => { 
                  setIsCreating('folder'); 
                  setCreatingParentId(contextMenu.item.id); 
                  setSelectedFolderId(contextMenu.item.id);
                  if (collapsed[contextMenu.item.id]) toggleFolder(contextMenu.item.id);
                  setNewName('new-folder');
                  setContextMenu(null); 
                }}
              >
                <Plus size={14} className="text-surface-400" />
                New Folder
              </button>
              <div className="h-px bg-surface-700/50 my-1 w-full" />
            </>
          )}
          <button 
            className="w-full text-left px-3 py-1.5 hover:bg-surface-700 hover:text-white flex items-center gap-2"
            onClick={() => { contextMenu.triggerRename(); setContextMenu(null); }}
          >
            <Edit2 size={14} className="text-surface-400" />
            Rename
          </button>
          <button 
            className="w-full text-left px-3 py-1.5 hover:bg-red-500/20 hover:text-red-400 flex items-center gap-2 text-red-400"
            onClick={() => { onDeleteFile(contextMenu.item.id); setContextMenu(null); }}
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export { getLanguageFromName };
export default FileExplorer;
