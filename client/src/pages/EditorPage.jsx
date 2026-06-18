import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageSquare, Video, PanelLeftClose, PanelLeftOpen, Terminal, GitBranch, Search, PenTool, Sparkles, FolderOpen, X } from 'lucide-react';
import Logo from '../components/shared/Logo';
import { DiffEditor } from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';
import useEditor from '../hooks/useEditor';
import useWebRTC from '../hooks/useWebRTC';
import { roomService } from '../services/roomService';
import { codeService } from '../services/codeService';
import showToast from '../components/shared/Toast';

import Loader from '../components/shared/Loader';
import EditorToolbar from '../components/editor/EditorToolbar';
import CodeEditor from '../components/editor/CodeEditor';
import EditorTabs from '../components/editor/EditorTabs';
import GlobalSearchPanel from '../components/editor/GlobalSearchPanel';
import OutputPanel from '../components/editor/OutputPanel';
import ChatPanel from '../components/chat/ChatPanel';
import VideoPanel from '../components/video/VideoPanel';
import UserPresence from '../components/users/UserPresence';
import FileExplorer, { getLanguageFromName } from '../components/editor/FileExplorer';
import TerminalPanel from '../components/editor/TerminalPanel';
import GitPanel from '../components/editor/GitPanel';
import WhiteboardPanel from '../components/editor/WhiteboardPanel';
import AIChatPanel from '../components/ai/AIChatPanel';
import { injectCursorStyles, removeCursorStyles, applyCursorDecoration, clearCursorDecoration } from '../components/users/UserCursor';

const EditorPage = () => {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Component state
  const [roomData, setRoomData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isOutputOpen, setIsOutputOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isGitPanelOpen, setIsGitPanelOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(true);
  const [isSnapshotsOpen, setIsSnapshotsOpen] = useState(false);
  const [isWhiteboardMode, setIsWhiteboardMode] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [diffSnap, setDiffSnap] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [isSnapshotsLoading, setIsSnapshotsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userStatuses, setUserStatuses] = useState({});
  const [userActiveFiles, setUserActiveFiles] = useState({}); // userId -> { fileId, userName, color }
  
  // File system state
  const [files, setFiles] = useState({
    'main': { name: 'main.js', type: 'file', parentId: null, content: '// Start coding here...\n', language: 'javascript' },
  });
  const [activeFileId, setActiveFileId] = useState('main');
  const [openTabs, setOpenTabs] = useState(['main']);
  const activeFileIdRef = useRef(activeFileId);
  const fileContentsRef = useRef({}); // cache file contents
  
  const remoteCursorsRef = useRef({});
  const terminalContainerRef = useRef(null);
  const whiteboardRef = useRef(null);
  const localVersionRef = useRef(0);
  const pendingOpsRef = useRef([]);
  const inflightOpRef = useRef(false);
  const hasJoinedRef = useRef(false);
  const typingTimerRef = useRef(null);
  const idleTimerRef = useRef(null);
  const isTypingRef = useRef(false);
  const isChatOpenRef = useRef(isChatOpen);

  // Keep ref in sync with state for callbacks
  useEffect(() => { isChatOpenRef.current = isChatOpen; }, [isChatOpen]);
  useEffect(() => { activeFileIdRef.current = activeFileId; }, [activeFileId]);

  // Editor hook
  const editorHooks = useEditor({ initialCode: '', initialLanguage: 'javascript' });
  const { language, isExecuting, output, setOutput, setIsExecuting, monacoRef, getCode } = editorHooks;

  // WebRTC hook
  const rtcHooks = useWebRTC(roomId, user?._id);

  // Initialize room data
  useEffect(() => {
    const initRoom = async () => {
      try {
        const data = await roomService.getRoom(roomId);
        setRoomData(data.room);
        editorHooks.setRemoteCode(data.room.code);
        editorHooks.setLanguage(data.room.language);
      } catch (error) {
        showToast.error('Failed to load room');
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };
    initRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, navigate]);

  // Track time coded by pinging server every 60s
  useEffect(() => {
    if (!roomId || !user) return;
    
    const ping = () => {
      fetch('/api/users/ping', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).catch(err => console.error('Ping failed:', err));
    };

    ping(); // initial ping
    const interval = setInterval(ping, 60000);
    return () => clearInterval(interval);
  }, [roomId, user]); // eslint-disable-next-line react-hooks/exhaustive-deps

  // Socket handlers
  const { emit, isConnected } = useSocket(roomId, {
    onRoomState: (state) => {
      const editor = editorHooks.editorRef.current;
      const monaco = monacoRef.current;

      const activeSocketIds = new Set(state.users.map((u) => u.socketId));

      if (editor) {
        Object.keys(remoteCursorsRef.current).forEach((socketId) => {
          if (!activeSocketIds.has(socketId)) {
            clearCursorDecoration(editor, remoteCursorsRef.current[socketId] || []);
            removeCursorStyles(socketId);
            delete remoteCursorsRef.current[socketId];
          }
        });
      }

      // Initialize file system
      if (state.files && Object.keys(state.files).length > 0) {
        setFiles(state.files);
        const mainFileId = 'main'; // default
        const activeId = state.files[mainFileId] ? mainFileId : Object.keys(state.files).find(k => state.files[k].type === 'file');
        
        if (activeId) {
          setActiveFileId(activeId);
          setOpenTabs([activeId]);
          editorHooks.setRemoteCode(state.files[activeId].content || '');
          editorHooks.setLanguage(state.files[activeId].language || 'javascript');
          editorHooks.setVersion(state.files[activeId].version || 0);
          localVersionRef.current = state.files[activeId].version || 0;
        }
      }

      setUsers(state.users);
      setSnapshots(state.snapshots || []);

      // Initialize userActiveFiles from the users array
      const activeFilesMap = {};
      state.users.forEach(u => {
        if (u.userId !== user._id && u.activeFileId) {
          activeFilesMap[u.userId] = { fileId: u.activeFileId, userName: u.userName, color: u.color };
        }
      });
      setUserActiveFiles(activeFilesMap);
      
      // Inject cursor styles for initial users
      state.users.forEach((u) => {
        if (u.userId === user._id) return;
        injectCursorStyles(u.socketId, u.color, u.userName);
        if (editor && monaco && u.cursorPosition) {
          remoteCursorsRef.current[u.socketId] = applyCursorDecoration(
            editor,
            monaco,
            u.socketId,
            u.cursorPosition,
            remoteCursorsRef.current[u.socketId] || []
          );
        }
      });
    },
    onUserJoined: (data) => {
      setUsers(data.users);
      injectCursorStyles(data.socketId, data.color, data.userName);
      showToast.info(`${data.userName} joined`);
    },
    onUserLeft: (data) => {
      setUsers(data.users);
      removeCursorStyles(data.socketId);
      if (editorHooks.editorRef.current) {
        clearCursorDecoration(editorHooks.editorRef.current, remoteCursorsRef.current[data.socketId] || []);
        delete remoteCursorsRef.current[data.socketId];
      }
      showToast.info(`${data.userName} left`);
      // Clean up active file tracking
      setUserActiveFiles(prev => {
        const next = { ...prev };
        const leftUser = data.users ? null : data;
        // Find userId of the left user and remove
        Object.keys(next).forEach(uid => {
          if (!data.users?.find(u => u.userId === uid)) {
            delete next[uid];
          }
        });
        return next;
      });
    },
    onCodeUpdate: (data) => {
      if (data.fileId === activeFileId) {
        editorHooks.applyRemoteOperation(data.operation);
        editorHooks.setVersion(data.version);
        localVersionRef.current = data.version;
        
        if (data.serverCode !== undefined) {
          const localCode = editorHooks.getCode();
          if (localCode !== data.serverCode) {
            console.warn('⚠️ OT drift on receiving end, auto-correcting...');
            editorHooks.setRemoteCode(data.serverCode);
          }
        }
      } else {
        // Update background file silently
        if (data.serverCode !== undefined) {
          fileContentsRef.current[data.fileId] = data.serverCode;
        }
        setFiles(prev => ({
          ...prev,
          [data.fileId]: {
            ...prev[data.fileId],
            content: data.serverCode,
            version: data.version
          }
        }));
      }
    },
    onCodeAck: (data) => {
      if (data.fileId === activeFileId) {
        editorHooks.setVersion(data.version);
        localVersionRef.current = data.version;
        inflightOpRef.current = false;
        
        if (data.serverCode !== undefined && pendingOpsRef.current.length === 0) {
          const localCode = editorHooks.getCode();
          if (localCode !== data.serverCode) {
            console.warn('⚠️ OT drift detected, auto-correcting...');
            editorHooks.setRemoteCode(data.serverCode);
          }
        }
        processNextOperation();
      } else {
        // Ack for a background file (should be rare if they switch fast)
        if (data.serverCode !== undefined) {
          fileContentsRef.current[data.fileId] = data.serverCode;
        }
        setFiles(prev => ({
          ...prev,
          [data.fileId]: {
            ...prev[data.fileId],
            content: data.serverCode,
            version: data.version
          }
        }));
      }
    },
    onCodeFullSync: (data) => {
      if (data.fileId === activeFileId) {
        editorHooks.setRemoteCode(data.code);
        if (typeof data.version === 'number') {
          editorHooks.setVersion(data.version);
          localVersionRef.current = data.version;
        }
        pendingOpsRef.current = [];
        inflightOpRef.current = false;
      } else {
        fileContentsRef.current[data.fileId] = data.code;
        setFiles(prev => ({
          ...prev,
          [data.fileId]: { ...prev[data.fileId], content: data.code, version: data.version }
        }));
      }
    },
    onCursorUpdate: (data) => {
      // Always update the users state so "Go to User" has the latest position
      setUsers(prev => prev.map(u => u.userId === data.userId ? { ...u, cursorPosition: data.position } : u));
      
      if (data.userId === user._id) return;
      if (data.fileId !== activeFileIdRef.current) return; // Ignore cursors from other files
      
      if (!editorHooks.editorRef.current) return;
      const editor = editorHooks.editorRef.current;
      const monaco = monacoRef.current;
      if (!monaco) return;

      injectCursorStyles(data.socketId, data.color, data.userName);
      
      remoteCursorsRef.current[data.socketId] = applyCursorDecoration(
        editor,
        monaco,
        data.socketId,
        data.position,
        remoteCursorsRef.current[data.socketId] || []
      );
    },
    onLanguageUpdated: (data) => {
      editorHooks.setLanguage(data.language);
    },
    onNewMessage: (msg) => {
      setMessages(prev => [...prev, msg]);
      // Increment unread badge when chat is closed
      if (!isChatOpenRef.current) {
        setUnreadCount(prev => prev + 1);
      }
    },
    onMessageHistory: (history) => {
      setMessages(history);
    },
    onExecutionStart: () => {
      setIsExecuting(true);
      setIsOutputOpen(true);
    },
    onExecutionResult: (res) => {
      setIsExecuting(false);
      setOutput(res);
    },
    onExecutionError: (err) => {
      setIsExecuting(false);
      setOutput({ stdout: '', stderr: err.message, status: 'Error' });
      showToast.error('Execution failed');
    },
    onUserTyping: ({ userId }) => {
      setUserStatuses(prev => ({ ...prev, [userId]: 'typing' }));
    },
    onUserStopTyping: ({ userId }) => {
      setUserStatuses(prev => ({ ...prev, [userId]: 'active' }));
    },
    onUserStatusChange: ({ userId, status }) => {
      setUserStatuses(prev => ({ ...prev, [userId]: status }));
    },
    onFileCreated: ({ fileId, fileData }) => {
      setFiles(prev => ({ ...prev, [fileId]: fileData }));
    },
    onFileDeleted: ({ fileId }) => {
      setFiles(prev => {
        const next = { ...prev };
        const deleteRecursive = (id) => {
          Object.entries(next).forEach(([childId, child]) => {
            if (child.parentId === id) deleteRecursive(childId);
          });
          delete next[id];
          delete fileContentsRef.current[id];
        };
        deleteRecursive(fileId);
        return next;
      });
      if (activeFileId === fileId) {
        // The active file got deleted remotely
        setFiles(prev => {
          const firstFile = Object.entries(prev).find(([, f]) => f.type === 'file');
          if (firstFile) {
            setActiveFileId(firstFile[0]);
            editorHooks.setRemoteCode(firstFile[1].content || '');
          }
          return prev;
        });
      }
    },
    onFileRenamed: ({ fileId, newName, newLanguage }) => {
      setFiles(prev => ({
        ...prev,
        [fileId]: { ...prev[fileId], name: newName, language: newLanguage || prev[fileId].language },
      }));
    },
    onFileMoved: ({ fileId, parentId }) => {
      setFiles(prev => ({
        ...prev,
        [fileId]: { ...prev[fileId], parentId },
      }));
    },
    onUserActiveFileChanged: ({ userId, fileId, userName, color }) => {
      setUserActiveFiles(prev => ({
        ...prev,
        [userId]: { fileId, userName, color },
      }));
    },
    onTerminalOutput: ({ terminalId, data }) => {
      console.log('[Terminal DEBUG CLIENT] onTerminalOutput received:', { terminalId, dataLen: data?.length, hasRef: !!terminalContainerRef.current, hasMethod: !!terminalContainerRef.current?.__handleOutput });
      setIsTerminalOpen(true); // Auto-open terminal when output arrives
      // Write terminal data to the xterm instance via the forwarded ref
      if (terminalContainerRef.current?.__handleOutput) {
        terminalContainerRef.current.__handleOutput(terminalId, data);
      } else {
        console.warn('[Terminal DEBUG CLIENT] terminalContainerRef.__handleOutput is missing!');
      }
    },
    onTerminalClosed: ({ terminalId }) => {
      if (terminalContainerRef.current?.__handleClosed) {
        terminalContainerRef.current.__handleClosed(terminalId);
      }
    },
    // ── Whiteboard Events ──
    onWhiteboardUpdate: (data) => {
      if (whiteboardRef.current?.__onWhiteboardUpdate) {
        whiteboardRef.current.__onWhiteboardUpdate(data);
      }
    },
    onWhiteboardSync: (data) => {
      if (whiteboardRef.current?.__onWhiteboardSync) {
        whiteboardRef.current.__onWhiteboardSync(data);
      }
    },
    onWhiteboardClear: () => {
      if (whiteboardRef.current?.__onWhiteboardClear) {
        whiteboardRef.current.__onWhiteboardClear();
      }
    },
  });

  const processNextOperation = () => {
    if (inflightOpRef.current || pendingOpsRef.current.length === 0 || !isConnected) return;
    
    const nextOp = pendingOpsRef.current.shift();
    inflightOpRef.current = true;
    
    emit('code-change', { fileId: activeFileId, operation: nextOp, version: localVersionRef.current });
  };

  // ── Typing Indicator Logic ────────────────────────────────────────
  const emitTypingStart = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emit('user-typing', { roomId, userId: user._id, userName: user.name });
    }
    // Reset stop-typing debounce
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      emit('user-stop-typing', { roomId, userId: user._id });
    }, 1500);
  }, [emit, roomId, user]);

  // ── Idle Detection ─────────────────────────────────────────────────
  useEffect(() => {
    const IDLE_TIMEOUT = 2 * 60 * 1000; // 2 minutes
    let currentStatus = 'active';

    const resetIdle = () => {
      clearTimeout(idleTimerRef.current);
      if (currentStatus !== 'active') {
        currentStatus = 'active';
        emit('user-status-change', { roomId, userId: user._id, status: 'active' });
        setUserStatuses(prev => ({ ...prev, [user._id]: 'active' }));
      }
      idleTimerRef.current = setTimeout(() => {
        currentStatus = 'idle';
        emit('user-status-change', { roomId, userId: user._id, status: 'idle' });
        setUserStatuses(prev => ({ ...prev, [user._id]: 'idle' }));
      }, IDLE_TIMEOUT);
    };

    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    resetIdle();

    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      clearTimeout(idleTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user._id]);

  // ── Snippet Sharing ────────────────────────────────────────────────
  const handleShareSnippet = useCallback(() => {
    const editor = editorHooks.editorRef.current;
    if (!editor) return;
    const selection = editor.getSelection();
    const selectedText = editor.getModel()?.getValueInRange(selection)?.trim();
    if (!selectedText) {
      showToast.error('Select some code first to share as a snippet');
      return;
    }
    emit('send-message', { text: selectedText, userId: user._id, userName: user.name, type: 'code' });
    if (!isChatOpenRef.current) setIsChatOpen(true);
    showToast.success('Code snippet shared in chat!');
  }, [editorHooks.editorRef, emit, user]);

  // Editor Event Wrappers
  const handleEditorChange = (value, event) => {
    const operations = editorHooks.handleEditorChange(value, event);
    if (operations && operations.length > 0) {
      // Only emit typing for LOCAL changes (handleEditorChange returns null for remote)
      emitTypingStart();
      pendingOpsRef.current.push(...operations);
      processNextOperation();
    }
  };



  const handleEditorMount = (editor, monaco) => {
    editorHooks.handleEditorDidMount(editor, monaco);
    
    // Add cursor tracking
    editor.onDidChangeCursorPosition((e) => {
      emit('cursor-move', {
        fileId: activeFileIdRef.current,
        userId: user._id,
        position: { lineNumber: e.position.lineNumber, column: e.position.column }
      });
    });
  };

  const handleOpenChat = () => {
    setIsChatOpen(true);
    setUnreadCount(0);
  };

  const handleToggleChat = () => {
    if (!isChatOpen) { setUnreadCount(0); }
    setIsChatOpen(prev => !prev);
  };

  const handleLanguageChange = (newLang) => {
    editorHooks.setLanguage(newLang);
    emit('language-change', { language: newLang });
  };

  const handleRunCode = async () => {
    setIsOutputOpen(true);
    if (!isConnected) {
      setOutput({ stdout: '', stderr: 'Socket disconnected. Reconnect to run code.', status: 'Error' });
      showToast.error('Socket disconnected. Please reconnect.');
      return;
    }
    emit('run-code', { code: getCode(), language });
  };

  const handleSaveSnapshot = async () => {
    try {
      const saveToast = showToast.loading('Saving snapshot...');
      // We can use emit('save-snapshot') which is the new pattern in socketHandler
      emit('save-snapshot', { fileId: activeFileId, code: getCode(), language, userId: user._id });
      showToast.dismiss(saveToast);
      showToast.success('Snapshot request sent!');
    } catch (error) {
      showToast.error('Failed to request snapshot');
    }
  };

  const handlePreview = () => {
    const port = window.prompt('Enter the port your web server is running on (e.g., 5174, 3000):', '5174');
    if (port && !isNaN(port)) {
      // Open the container port directly on the server host.
      // Docker's -p mappings expose container ports on the host machine,
      // so we can access them directly without a proxy.
      // This avoids all CSP, path-rewriting, and CORS issues with Vite dev servers.
      const apiUrl = import.meta.env.VITE_API_URL || '';
      let serverHost = '';
      if (apiUrl) {
        try {
          const url = new URL(apiUrl);
          serverHost = url.hostname;
          // Bypass Chrome's HSTS by using the raw IP address instead of the duckdns domain
          if (serverHost === 'codehive-api.duckdns.org') {
            serverHost = '13.60.167.96';
          }
        } catch (e) {
          serverHost = window.location.hostname;
        }
      } else {
        serverHost = window.location.hostname;
      }
      // Use http for direct port access (no SSL on ephemeral Docker ports)
      window.open(`http://${serverHost}:${port}/`, '_blank');
    }
  };

  const handleOpenSnapshots = async () => {
    setIsSnapshotsOpen(true);
    setIsSnapshotsLoading(true);
    try {
      const data = await codeService.getSnapshots(roomId);
      setSnapshots(data.snapshots || []);
    } catch (error) {
      showToast.error('Failed to load snapshots');
    } finally {
      setIsSnapshotsLoading(false);
    }
  };

  const handleRestoreSnapshot = (snapshot) => {
    editorHooks.setRemoteCode(snapshot.code || '');
    const nextLanguage = snapshot.language || language;
    editorHooks.setLanguage(nextLanguage);

    if (isConnected) {
      emit('code-sync', { fileId: activeFileId, code: snapshot.code || '' });
      emit('language-change', { language: nextLanguage });
      showToast.success('Snapshot restored');
    } else {
      showToast.error('Socket disconnected. Snapshot restored locally only.');
    }
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast.success('Room link copied to clipboard!');
  };

  // ── File System Handlers ─────────────────────────────────────────
  const handleSelectFile = useCallback((fileId) => {
    if (fileId === activeFileId) return;
    
    // Save current file's content
    const currentCode = editorHooks.getCode();
    fileContentsRef.current[activeFileId] = currentCode;
    setFiles(prev => ({
      ...prev,
      [activeFileId]: { ...prev[activeFileId], content: currentCode },
    }));

    // Emit active file change
    emit('active-file-change', { fileId });

    // Load new file's content
    const newFile = files[fileId];
    if (newFile && newFile.type === 'file') {
      setActiveFileId(fileId);
      setOpenTabs(prev => prev.includes(fileId) ? prev : [...prev, fileId]);
      activeFileIdRef.current = fileId; // Update ref immediately
      const content = fileContentsRef.current[fileId] ?? newFile.content ?? '';
      editorHooks.setRemoteCode(content);
      if (newFile.language) editorHooks.setLanguage(newFile.language);
      
      const newVersion = newFile.version || 0;
      editorHooks.setVersion(newVersion);
      localVersionRef.current = newVersion;

      // Clear old remote cursors and draw cursors of users in this file
      const editor = editorHooks.editorRef.current;
      const monaco = monacoRef.current;
      if (editor && monaco) {
        // Clear all existing
        Object.keys(remoteCursorsRef.current).forEach((socketId) => {
          clearCursorDecoration(editor, remoteCursorsRef.current[socketId] || []);
          delete remoteCursorsRef.current[socketId];
        });

        // Re-draw users in the new file
        users.forEach(u => {
          if (u.userId === user._id) return;
          const userFileId = userActiveFiles[u.userId]?.fileId;
          if (userFileId === fileId && u.cursorPosition) {
            injectCursorStyles(u.socketId, u.color, u.userName);
            remoteCursorsRef.current[u.socketId] = applyCursorDecoration(
              editor,
              monaco,
              u.socketId,
              u.cursorPosition,
              []
            );
          }
        });
      }
    }
  }, [activeFileId, files, editorHooks, emit, users, userActiveFiles, user._id]);

  const handleCreateFile = useCallback((name, parentId, initialContent = '') => {
    const id = `file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const lang = getLanguageFromName(name);
    
    const newFileData = { name, type: 'file', parentId, content: initialContent, language: lang, version: 0 };
    
    setFiles(prev => ({
      ...prev,
      [id]: newFileData,
    }));

    emit('file-created', { fileId: id, fileData: newFileData });

    // Auto-select the new file
    const currentCode = editorHooks.getCode();
    fileContentsRef.current[activeFileId] = currentCode;
    setActiveFileId(id);
    setOpenTabs(prev => [...prev, id]);
    editorHooks.setRemoteCode(initialContent);
    editorHooks.setLanguage(lang);
    editorHooks.setVersion(0);
    localVersionRef.current = 0;
    
    emit('active-file-change', { fileId: id });
  }, [activeFileId, editorHooks, emit]);

  const handleCreateFolder = useCallback((name, parentId) => {
    const id = `folder_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newFolderData = { name, type: 'folder', parentId };
    
    setFiles(prev => ({
      ...prev,
      [id]: newFolderData,
    }));
    
    emit('file-created', { fileId: id, fileData: newFolderData });
  }, [emit]);

  const handleMoveFile = useCallback((fileId, targetParentId) => {
    setFiles(prev => {
      // Prevent moving folder into itself or its descendants
      if (fileId === targetParentId) return prev;
      let p = targetParentId;
      while (p) {
        if (p === fileId) return prev; // cyclic
        p = prev[p]?.parentId;
      }
      
      return {
        ...prev,
        [fileId]: { ...prev[fileId], parentId: targetParentId },
      };
    });
    
    emit('file-moved', { fileId, parentId: targetParentId });
  }, [emit]);

  const handleDeleteFile = useCallback((fileId) => {
    setFiles(prev => {
      const next = { ...prev };
      // Also delete children if folder
      const deleteRecursive = (id) => {
        Object.entries(next).forEach(([childId, child]) => {
          if (child.parentId === id) deleteRecursive(childId);
        });
        delete next[id];
        delete fileContentsRef.current[id];
      };
      deleteRecursive(fileId);
      return next;
    });
    
    emit('file-deleted', { fileId });

    // If active file was deleted, switch to first available
    if (fileId === activeFileId) {
      setFiles(prev => {
        const firstFile = Object.entries(prev).find(([, f]) => f.type === 'file');
        if (firstFile) {
          setActiveFileId(firstFile[0]);
          setOpenTabs(tabs => tabs.filter(t => t !== fileId).concat(tabs.includes(firstFile[0]) ? [] : [firstFile[0]]));
          editorHooks.setRemoteCode(firstFile[1].content || '');
          emit('active-file-change', { fileId: firstFile[0] });
        }
        return prev;
      });
    }
  }, [activeFileId, editorHooks, emit]);

  const handleRenameFile = useCallback((fileId, newName) => {
    const newLanguage = files[fileId]?.type === 'file' ? getLanguageFromName(newName) : undefined;
    
    setFiles(prev => ({
      ...prev,
      [fileId]: { ...prev[fileId], name: newName, language: newLanguage || prev[fileId].language },
    }));

    emit('file-renamed', { fileId, newName, newLanguage });
  }, [files, emit]);

  const handleCloseTab = useCallback((fileId) => {
    setOpenTabs(prev => {
      const newTabs = prev.filter(id => id !== fileId);
      if (activeFileId === fileId && newTabs.length > 0) {
        // If closing active tab, switch to the last tab in the new list
        handleSelectFile(newTabs[newTabs.length - 1]);
      } else if (newTabs.length === 0) {
        // If closing the very last tab
        setActiveFileId(null);
        activeFileIdRef.current = null;
      }
      return newTabs;
    });
  }, [activeFileId, handleSelectFile]);

  const handleSelectMatch = useCallback((fileId, match) => {
    handleSelectFile(fileId);
    if (editorHooks.editorRef.current) {
      setTimeout(() => {
        const editor = editorHooks.editorRef.current;
        editor.revealPositionInCenter({ lineNumber: match.lineNumber, column: match.column });
        editor.setPosition({ lineNumber: match.lineNumber, column: match.column });
        editor.focus();
      }, 150);
    }
  }, [handleSelectFile, editorHooks.editorRef]);

  // ── Go-to-User Handler ────────────────────────────────────────────
  const handleGoToUser = useCallback((userId) => {
    const activeFile = userActiveFiles[userId];
    if (!activeFile || !activeFile.fileId) {
      showToast.info('User is not currently editing any file');
      return;
    }

    // Switch to the user's file
    handleSelectFile(activeFile.fileId);

    // Find the user's cursor position from the users array
    const targetUser = users.find(u => u.userId === userId);
    if (targetUser?.cursorPosition && editorHooks.editorRef.current) {
      setTimeout(() => {
        const editor = editorHooks.editorRef.current;
        if (editor) {
          editor.revealPositionInCenter({
            lineNumber: targetUser.cursorPosition.lineNumber,
            column: targetUser.cursorPosition.column,
          });
        }
      }, 100); // Small delay to let the file load
    }

    showToast.info(`Jumped to ${activeFile.userName}'s cursor`);
  }, [userActiveFiles, users, handleSelectFile, editorHooks.editorRef]);


  // Connect to socket when room loads
  useEffect(() => {
    if (roomData && isConnected) {
      if (!hasJoinedRef.current) {
        emit('join-room', { userId: user._id, userName: user.name });
        hasJoinedRef.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomData, isConnected]);

  useEffect(() => {
    if (!isConnected) {
      hasJoinedRef.current = false;
      const editor = editorHooks.editorRef.current;
      if (editor) {
        Object.keys(remoteCursorsRef.current).forEach((socketId) => {
          clearCursorDecoration(editor, remoteCursorsRef.current[socketId] || []);
          removeCursorStyles(socketId);
          delete remoteCursorsRef.current[socketId];
        });
      }
    }
  }, [isConnected]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-surface-950"><Loader text="Preparing editor..." /></div>;
  }

  return (
    <div className="h-screen flex flex-col bg-surface-950 text-white overflow-hidden">
      {/* Top Navbar replacement for editor */}
      <div className="h-12 border-b border-surface-700/30 flex items-center justify-between px-4 shrink-0 bg-surface-900/60 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsFileExplorerOpen(prev => !prev)} className="btn-ghost !p-1.5 hidden sm:inline-flex -ml-2" title="Toggle Explorer">
            {isFileExplorerOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <Logo size={24} withText />
          </div>
          <div className="h-4 w-px bg-surface-700/40 mx-1"></div>
          <span className="text-sm font-medium truncate max-w-[200px] text-surface-300">
            {roomData?.name || 'Untitled Room'}
          </span>
          <span className="badge bg-surface-800/60 text-surface-400 font-mono text-[10px] hidden sm:inline-flex">
            {roomId}
          </span>
        </div>

        <div className="hidden md:flex items-center gap-1.5">
          {/* Connection status */}
          <div className="flex items-center gap-1.5 mr-3" title={isConnected ? 'Connected' : 'Disconnected'}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`}></div>
            <span className="text-xs text-surface-400 hidden lg:inline">{isConnected ? 'Syncing' : 'Offline'}</span>
          </div>

          <button onClick={() => setIsSearchOpen(prev => !prev)} className={`btn-ghost !p-1.5 ${isSearchOpen ? 'text-blue-400 bg-blue-500/10' : ''}`} title="Search (Ctrl+Shift+F)">
            <Search size={18} />
          </button>

          <button onClick={() => rtcHooks.isInCall ? rtcHooks.endCall() : rtcHooks.startCall(user.name)} className={`btn-ghost !p-1.5 ${rtcHooks.isInCall ? 'text-hive-400 bg-hive-500/10' : ''}`} title="Video Call">
            <Video size={18} />
          </button>

          <button onClick={() => setIsGitPanelOpen(prev => !prev)} className={`btn-ghost !p-1.5 ${isGitPanelOpen ? 'text-orange-400 bg-orange-500/10' : ''}`} title="Git">
            <GitBranch size={18} />
          </button>

          <button onClick={() => setIsWhiteboardMode(prev => !prev)} className={`btn-ghost !p-1.5 ${isWhiteboardMode ? 'text-pink-400 bg-pink-500/10' : ''}`} title="Whiteboard">
            <PenTool size={18} />
          </button>

          <button onClick={() => setIsTerminalOpen(prev => !prev)} className={`btn-ghost !p-1.5 ${isTerminalOpen ? 'text-emerald-400 bg-emerald-500/10' : ''}`} title="Terminal">
            <Terminal size={18} />
          </button>

          <button onClick={() => setIsAIChatOpen(prev => !prev)} className={`btn-ghost !p-1.5 ${isAIChatOpen ? 'text-violet-400 bg-violet-500/10' : ''}`} title="AI Assistant">
            <Sparkles size={18} />
          </button>
          
          <button onClick={handleToggleChat} className={`btn-ghost !p-1.5 relative ${isChatOpen ? 'text-honey-400 bg-honey-500/10' : ''}`} title="Chat (Ctrl+Shift+C)">
            <MessageSquare size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Mobile: connection dot only */}
        <div className="flex md:hidden items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden pb-14 md:pb-0">
        
        {/* File Explorer Panel — desktop */}
        <div className={`flex-col border-r border-surface-700/20 transition-all duration-300 hidden md:flex ${isFileExplorerOpen ? 'w-52' : 'w-0 overflow-hidden border-r-0'}`}>
          <FileExplorer
            files={files}
            activeFileId={activeFileId}
            onSelectFile={handleSelectFile}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onDeleteFile={handleDeleteFile}
            onRenameFile={handleRenameFile}
            onMoveFile={handleMoveFile}
            userActiveFiles={userActiveFiles}
          />
        </div>

        {/* Git Panel */}
        {isGitPanelOpen && (
          <div className="w-56 flex-col border-r border-surface-700/20 hidden md:flex shrink-0">
            <GitPanel
              isVisible={isGitPanelOpen}
              onClose={() => setIsGitPanelOpen(false)}
              roomId={roomId}
              roomData={roomData}
              user={user}
              files={files}
              onImportComplete={() => {
                window.location.reload();
              }}
            />
          </div>
        )}

        {/* Global Search Panel */}
        {isSearchOpen && (
          <div className="w-64 flex-col border-r border-surface-700/20 hidden md:flex shrink-0">
            <GlobalSearchPanel
              isVisible={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
              files={files}
              onSelectMatch={handleSelectMatch}
            />
          </div>
        )}

        {/* Center Column - Editor + Video + Output */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          
          {/* Video Panel (conditionally rendered) */}
          <VideoPanel 
            {...rtcHooks}
            userName={user.name}
            onStartCall={() => rtcHooks.startCall(user.name)}
            onEndCall={rtcHooks.endCall}
            onToggleAudio={rtcHooks.toggleAudio}
            onToggleVideo={rtcHooks.toggleVideo}
          />
          
          {/* Editor Toolbar */}
          <EditorToolbar 
            language={language}
            onLanguageChange={handleLanguageChange}
            onRun={handleRunCode}
            onSave={handleSaveSnapshot}
            onOpenSnapshots={handleOpenSnapshots}
            onCopyLink={copyRoomLink}
            onShareSnippet={handleShareSnippet}
            onPreview={handlePreview}
            isExecuting={isExecuting}
            usersCount={users.length}
          />

          {/* Editor Tabs */}
          <EditorTabs
            files={files}
            openTabs={openTabs}
            activeFileId={activeFileId}
            onSelectTab={handleSelectFile}
            onCloseTab={handleCloseTab}
          />

          {/* Editor Wrapper / Whiteboard */}
          <div className="flex-1 min-h-0 relative bg-surface-950">
            {isWhiteboardMode ? (
              <WhiteboardPanel
                emit={emit}
                isConnected={isConnected}
                onRegisterHandlers={(handlers) => {
                  whiteboardRef.current = handlers;
                }}
              />
            ) : openTabs.length > 0 ? (
              <CodeEditor 
                language={language}
                onChange={handleEditorChange}
                onMount={handleEditorMount}
                onRun={handleRunCode}
                onSave={handleSaveSnapshot}
                onShareSnippet={handleShareSnippet}
                onToggleChat={handleToggleChat}
                onToggleOutput={() => setIsOutputOpen(prev => !prev)}
                monacoRef={monacoRef}
                isAIAutocompleteEnabled={true}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20 select-none">
                <Logo size={64} className="mb-4" />
                <h2 className="text-2xl font-bold text-white">CodeHive</h2>
                <p className="text-sm text-surface-400">Select a file to start coding</p>
              </div>
            )}
          </div>

          {/* Output Panel */}
          <OutputPanel 
            isVisible={isOutputOpen}
            onClose={() => setIsOutputOpen(false)}
            output={output}
            isExecuting={isExecuting}
          />

          {/* Terminal Panel */}
          <TerminalPanel
            ref={terminalContainerRef}
            isVisible={isTerminalOpen}
            onClose={() => setIsTerminalOpen(false)}
            emit={emit}
            isConnected={isConnected}
            onExplainError={(terminalOutput) => {
              setIsAIChatOpen(true);
              // Small delay to let the AI panel mount, then inject the error
              setTimeout(() => {
                if (window.__codehiveAISend) {
                  window.__codehiveAISend(
                    `Please explain the following terminal error and suggest how to fix it:\n\n\`\`\`\n${terminalOutput}\n\`\`\``,
                    true
                  );
                }
              }, 300);
            }}
          />
        </div>

        {/* Right Column - Chat + Presence + AI Chat — desktop */}
        <div className={`hidden md:flex flex-col border-l border-surface-700/20 transition-all duration-300 ${(isChatOpen || isAIChatOpen) ? 'w-72 lg:w-80' : 'w-0 overflow-hidden border-l-0'}`}>
          <div className="h-36 border-b border-surface-700/20 bg-surface-900/30 overflow-y-auto shrink-0">
            <UserPresence
              users={users}
              currentUserId={user._id}
              userStatuses={userStatuses}
              userActiveFiles={userActiveFiles}
              files={files}
              onGoToUser={handleGoToUser}
            />
          </div>
          <div className="flex-1 flex flex-col overflow-hidden bg-surface-900/40">
            {isAIChatOpen ? (
              <AIChatPanel
                isVisible={true}
                onClose={() => setIsAIChatOpen(false)}
                getCode={getCode}
                language={language}
                activeFileName={files[activeFileId]?.name}
              />
            ) : (
              <ChatPanel 
                isVisible={true}
                messages={messages}
                currentUserId={user._id}
                onSendMessage={(text) => emit('send-message', { text, userId: user._id, userName: user.name })}
                onClose={() => setIsChatOpen(false)}
              />
            )}
          </div>
        </div>

      </div>

      {/* ── Mobile Bottom Navigation Bar ────────────────────────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-surface-900/95 backdrop-blur-xl border-t border-surface-700/30 flex items-center justify-around px-2">
        <button
          onClick={() => setIsFileExplorerOpen(prev => !prev)}
          className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg transition-colors ${isFileExplorerOpen ? 'text-hive-400' : 'text-surface-400'}`}
        >
          <FolderOpen size={20} />
          <span className="text-[9px] font-medium">Files</span>
        </button>
        <button
          onClick={() => setIsTerminalOpen(prev => !prev)}
          className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg transition-colors ${isTerminalOpen ? 'text-emerald-400' : 'text-surface-400'}`}
        >
          <Terminal size={20} />
          <span className="text-[9px] font-medium">Terminal</span>
        </button>
        <button
          onClick={() => { setIsAIChatOpen(prev => !prev); setIsChatOpen(false); }}
          className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg transition-colors ${isAIChatOpen ? 'text-violet-400' : 'text-surface-400'}`}
        >
          <Sparkles size={20} />
          <span className="text-[9px] font-medium">AI</span>
        </button>
        <button
          onClick={() => { handleToggleChat(); setIsAIChatOpen(false); }}
          className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg transition-colors relative ${isChatOpen ? 'text-honey-400' : 'text-surface-400'}`}
        >
          <MessageSquare size={20} />
          <span className="text-[9px] font-medium">Chat</span>
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setIsWhiteboardMode(prev => !prev)}
          className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg transition-colors ${isWhiteboardMode ? 'text-pink-400' : 'text-surface-400'}`}
        >
          <PenTool size={20} />
          <span className="text-[9px] font-medium">Draw</span>
        </button>
      </div>

      {/* ── Mobile Panel Overlays ───────────────────────────────── */}
      {/* Mobile File Explorer Overlay */}
      {isFileExplorerOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-surface-950/70 backdrop-blur-sm" onClick={() => setIsFileExplorerOpen(false)} />
          <div className="absolute left-0 top-0 bottom-14 w-72 bg-surface-900 border-r border-surface-700/30 shadow-2xl animate-slide-in-left overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-surface-700/20">
              <span className="text-sm font-semibold text-surface-200">File Explorer</span>
              <button onClick={() => setIsFileExplorerOpen(false)} className="p-1 rounded hover:bg-surface-800 text-surface-400"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-auto">
              <FileExplorer
                files={files}
                activeFileId={activeFileId}
                onSelectFile={(id) => { handleSelectFile(id); setIsFileExplorerOpen(false); }}
                onCreateFile={handleCreateFile}
                onCreateFolder={handleCreateFolder}
                onDeleteFile={handleDeleteFile}
                onRenameFile={handleRenameFile}
                onMoveFile={handleMoveFile}
                userActiveFiles={userActiveFiles}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Chat / AI Overlay */}
      {(isChatOpen || isAIChatOpen) && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-surface-950/70 backdrop-blur-sm" onClick={() => { setIsChatOpen(false); setIsAIChatOpen(false); }} />
          <div className="absolute right-0 top-0 bottom-14 w-full max-w-sm bg-surface-900 border-l border-surface-700/30 shadow-2xl animate-slide-in-right overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-surface-700/20">
              <span className="text-sm font-semibold text-surface-200">{isAIChatOpen ? 'AI Assistant' : 'Chat'}</span>
              <button onClick={() => { setIsChatOpen(false); setIsAIChatOpen(false); }} className="p-1 rounded hover:bg-surface-800 text-surface-400"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-hidden">
              {isAIChatOpen ? (
                <AIChatPanel
                  isVisible={true}
                  onClose={() => setIsAIChatOpen(false)}
                  getCode={getCode}
                  language={language}
                  activeFileName={files[activeFileId]?.name}
                />
              ) : (
                <ChatPanel 
                  isVisible={true}
                  messages={messages}
                  currentUserId={user._id}
                  onSendMessage={(text) => emit('send-message', { text, userId: user._id, userName: user.name })}
                  onClose={() => setIsChatOpen(false)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {isSnapshotsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-2xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Snapshots</h2>
              <button
                onClick={() => setIsSnapshotsOpen(false)}
                className="btn-ghost !px-3 !py-1 text-xs"
              >
                Close
              </button>
            </div>

            {isSnapshotsLoading ? (
              <Loader text="Loading snapshots..." />
            ) : snapshots.length === 0 ? (
              <div className="text-sm text-surface-400">No snapshots saved yet.</div>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {snapshots.map((snap) => (
                  <div
                    key={snap._id}
                    className="p-3 rounded-xl border border-surface-800 bg-surface-900/50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm">
                        <div className="text-surface-200 font-medium">
                          {new Date(snap.savedAt).toLocaleString()}
                        </div>
                        <div className="text-xs text-surface-500">
                          {snap.savedBy?.name ? `Saved by ${snap.savedBy.name}` : 'Saved snapshot'}
                          {snap.language ? ` • ${snap.language}` : ''}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDiffSnap(snap)}
                          className="btn-ghost !px-3 !py-1 text-xs"
                        >
                          Diff
                        </button>
                        <button
                          onClick={() => handleRestoreSnapshot(snap)}
                          className="btn-secondary !px-3 !py-1 text-xs"
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Diff Viewer Modal */}
      {diffSnap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card w-full max-w-6xl flex flex-col animate-slide-up" style={{ height: '85vh' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
              <div>
                <h2 className="text-lg font-bold">Snapshot Diff</h2>
                <p className="text-xs text-surface-500 mt-1">
                  Compare changes between your saved snapshot and the current code
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { handleRestoreSnapshot(diffSnap); setDiffSnap(null); }}
                  className="btn-primary !px-4 !py-1.5 text-xs"
                >
                  Restore Snapshot
                </button>
                <button
                  onClick={() => setDiffSnap(null)}
                  className="btn-ghost !px-3 !py-1.5 text-xs"
                >
                  Close
                </button>
              </div>
            </div>
            {/* Color-coded column headers */}
            <div className="flex border-b border-surface-800">
              <div className="flex-1 px-6 py-2 bg-red-500/5 border-r border-surface-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-xs font-medium text-red-400">Snapshot</span>
                  <span className="text-[10px] text-surface-600 font-mono">
                    {new Date(diffSnap.savedAt).toLocaleString()}
                    {diffSnap.savedBy?.name ? ` • ${diffSnap.savedBy.name}` : ''}
                  </span>
                </div>
              </div>
              <div className="flex-1 px-6 py-2 bg-emerald-500/5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-emerald-400">Current Code</span>
                  <span className="text-[10px] text-surface-600">Live</span>
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <DiffEditor
                height="100%"
                language={diffSnap.language || language}
                original={diffSnap.code || ''}
                modified={getCode()}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  renderSideBySide: true,
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  renderIndicators: true,
                  renderMarginRevertIcon: false,
                  padding: { top: 8, bottom: 8 },
                  diffWordWrap: 'on',
                  enableSplitViewResizing: true,
                  ignoreTrimWhitespace: false,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorPage;
