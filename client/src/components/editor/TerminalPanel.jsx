import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Terminal as TerminalIcon, X, Trash2, RotateCcw, Plus, Sparkles } from 'lucide-react';

/**
 * Inner Terminal Instance
 *
 * KEY DESIGN: We attach the xterm `onData` listener once during initialization,
 * and use refs (not state) for all mutable values (`emit`, `isConnected`,
 * `isStarted`). This avoids the React-batching race condition where a
 * useEffect depending on multiple state flags never fires at the right time.
 */
const TerminalInstance = forwardRef(({ terminalId, isVisible, emit, isConnected, onStop }, ref) => {
  const terminalContainerRef = useRef(null);
  const terminalRef = useRef(null);
  const fitAddonRef = useRef(null);
  const [isStarted, setIsStarted] = useState(false);

  // ── Mutable refs that the onData closure reads ──
  const emitRef = useRef(emit);
  const isConnectedRef = useRef(isConnected);
  const isStartedRef = useRef(false);

  // Keep refs in sync with latest props / state
  useEffect(() => { emitRef.current = emit; }, [emit]);
  useEffect(() => { isConnectedRef.current = isConnected; }, [isConnected]);
  useEffect(() => { isStartedRef.current = isStarted; }, [isStarted]);

  // ── Imperative API exposed to the parent TerminalPanel ──
  useImperativeHandle(ref, () => ({
    __handleOutput: (data) => {
      if (terminalRef.current) {
        terminalRef.current.write(data);
      }
    },
    clear: () => {
      if (terminalRef.current) terminalRef.current.clear();
    },
    stop: () => {
      emitRef.current('terminal-stop', { terminalId });
      setIsStarted(false);
      isStartedRef.current = false;
      if (terminalRef.current) {
        terminalRef.current.clear();
        terminalRef.current.writeln('\x1b[90mTerminal session ended.\x1b[0m');
      }
      onStop(terminalId);
    },
    start: () => {
      console.log('[Terminal DEBUG] start() called for', terminalId, { isStarted: isStartedRef.current });
      if (isStartedRef.current) return; // Prevent double-start
      // Send actual xterm dimensions so PTY matches exactly
      const cols = terminalRef.current?.cols || 80;
      const rows = terminalRef.current?.rows || 24;
      emitRef.current('terminal-start', { terminalId, cols, rows });
      setIsStarted(true);
      isStartedRef.current = true;
      if (terminalRef.current) {
        terminalRef.current.focus();
      }
    },
    isStarted: () => isStartedRef.current,
    _getBuffer: () => {
      if (!terminalRef.current) return '';
      const buf = terminalRef.current.buffer.active;
      const lines = [];
      const start = Math.max(0, buf.cursorY - 50);
      for (let i = start; i <= buf.cursorY + buf.viewportY; i++) {
        const line = buf.getLine(i);
        if (line) lines.push(line.translateToString(true));
      }
      return lines.join('\n').trim();
    },
  }), [terminalId, onStop]);

  // ── Auto-reconnect terminal on socket reconnect ──
  useEffect(() => {
    if (isConnected && isStartedRef.current) {
      emitRef.current('terminal-start', { terminalId });
    }
  }, [isConnected, terminalId]);

  // ── Initialize xterm (runs once when the tab becomes visible) ──
  useEffect(() => {
    if (!isVisible && !terminalRef.current) return;   // wait until visible
    if (terminalRef.current) return;                   // already initialized

    let mounted = true;

    const initTerminal = async () => {
      try {
        const { Terminal } = await import('@xterm/xterm');
        const { FitAddon } = await import('@xterm/addon-fit');
        const { WebLinksAddon } = await import('@xterm/addon-web-links');
        await import('@xterm/xterm/css/xterm.css');

        if (!mounted || !terminalContainerRef.current) return;

        const terminal = new Terminal({
          cursorBlink: true,
          cursorStyle: 'bar',
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          theme: {
            background: '#0c0e14',
            foreground: '#c9d1d9',
            cursor: '#f5a623',
            cursorAccent: '#0c0e14',
            selectionBackground: '#f5a62330',
            selectionForeground: '#ffffff',
            black: '#0d1117',
            red: '#ff7b72',
            green: '#7ee787',
            yellow: '#ffa657',
            blue: '#79c0ff',
            magenta: '#d2a8ff',
            cyan: '#a5d6ff',
            white: '#c9d1d9',
            brightBlack: '#484f58',
            brightRed: '#ffa198',
            brightGreen: '#56d364',
            brightYellow: '#e3b341',
            brightBlue: '#a5d6ff',
            brightMagenta: '#d2a8ff',
            brightCyan: '#76e3ea',
            brightWhite: '#f0f6fc',
          },
          allowTransparency: true,
          scrollback: 5000,
          convertEol: false,
        });

        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();

        terminal.loadAddon(fitAddon);
        terminal.loadAddon(webLinksAddon);

        terminal.open(terminalContainerRef.current);

        if (isVisible) {
          fitAddon.fit();
        }

        terminalRef.current = terminal;
        fitAddonRef.current = fitAddon;

        // Welcome message
        terminal.writeln('\x1b[38;2;245;166;35m🐝 CodeHive Terminal\x1b[0m');
        terminal.writeln(`\x1b[90mSession: ${terminalId}\x1b[0m`);
        terminal.writeln('\x1b[90mTip: Select text to copy. Right-click or Ctrl+V to paste.\x1b[0m');
        terminal.writeln('');

        // ────────────────────────────────────────────────────────────
        // KEYBOARD INPUT — attached once, reads mutable refs
        // ────────────────────────────────────────────────────────────
        terminal.onData((data) => {
          // Filter out focus-in/out events and empty strings — these corrupt the Docker shell
          if (!data || data === '\x1b[I' || data === '\x1b[O') return;
          if (isStartedRef.current && isConnectedRef.current) {
            emitRef.current('terminal-input', { terminalId, data });
          }
        });

        // ── COPY & PASTE ──
        terminal.onSelectionChange(() => {
          if (terminal.hasSelection()) {
            navigator.clipboard.writeText(terminal.getSelection()).catch(() => {});
          }
        });

        terminal.attachCustomKeyEventHandler((e) => {
          if (e.type === 'keydown') {
            if (e.ctrlKey && e.code === 'KeyV') {
              navigator.clipboard.readText().then((text) => {
                if (text && isStartedRef.current && isConnectedRef.current) {
                  emitRef.current('terminal-input', { terminalId, data: text });
                }
              }).catch(() => {});
              return false;
            }
            if (e.ctrlKey && e.code === 'KeyC') {
              if (terminal.hasSelection()) {
                navigator.clipboard.writeText(terminal.getSelection()).catch(() => {});
                terminal.clearSelection();
                return false;
              }
            }
          }
          return true;
        });

        terminalContainerRef.current.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          navigator.clipboard.readText().then((text) => {
            if (text && isStartedRef.current && isConnectedRef.current) {
              emitRef.current('terminal-input', { terminalId, data: text });
            }
          }).catch(() => {});
        });

      } catch (err) {
        console.error('Failed to initialize terminal:', err);
      }
    };

    initTerminal();

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, terminalId]);

  // ── Resize handling ──
  useEffect(() => {
    if (!isVisible || !fitAddonRef.current) return;

    const handleResize = () => {
      try {
        fitAddonRef.current.fit();
        const terminal = terminalRef.current;
        if (terminal && isStartedRef.current) {
          emitRef.current('terminal-resize', {
            terminalId,
            cols: terminal.cols,
            rows: terminal.rows,
          });
        }
      } catch (err) { /* ignore */ }
    };

    handleResize();

    const timer = setTimeout(handleResize, 300);
    window.addEventListener('resize', handleResize);

    const observer = new ResizeObserver(handleResize);
    if (terminalContainerRef.current) {
      observer.observe(terminalContainerRef.current);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [isVisible, terminalId]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (terminalRef.current) {
        terminalRef.current.dispose();
        terminalRef.current = null;
        fitAddonRef.current = null;
      }
    };
  }, []);

  return (
    <div
      className={`flex-1 min-h-0 px-1 py-1 ${!isVisible ? 'hidden' : ''}`}
      style={{ overflow: 'hidden' }}
    >
      <div ref={terminalContainerRef} className="w-full h-full" />
    </div>
  );
});

TerminalInstance.displayName = 'TerminalInstance';

// ═══════════════════════════════════════════════════════════════
// Terminal Panel (Multi-tab container)
// ═══════════════════════════════════════════════════════════════
const TerminalPanel = forwardRef(({ isVisible, onClose, emit, isConnected, onExplainError }, ref) => {
  const [terminals, setTerminals] = useState([{ id: 'term-1', name: 'Terminal 1' }]);
  const [activeTab, setActiveTab] = useState('term-1');
  const instanceRefs = useRef({});

  useImperativeHandle(ref, () => ({
    __handleOutput: (terminalId, data) => {
      const id = terminalId || 'term-1';
      if (instanceRefs.current[id]) {
        instanceRefs.current[id].__handleOutput(data);
      }
    },
    __handleClosed: (terminalId) => {
      // Handled server-side cleanup
    },
  }), []);

  const handleCreateTerminal = useCallback(() => {
    const newId = `term-${Date.now()}`;
    const newName = `Terminal ${terminals.length + 1}`;
    setTerminals((prev) => [...prev, { id: newId, name: newName }]);
    setActiveTab(newId);

    // Auto-start after React renders the new instance
    setTimeout(() => {
      if (instanceRefs.current[newId]) {
        instanceRefs.current[newId].start();
      }
    }, 200);
  }, [terminals.length]);

  const handleCloseTab = useCallback((e, id) => {
    e.stopPropagation();
    if (instanceRefs.current[id]) {
      instanceRefs.current[id].stop();
    }
    setTerminals((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (activeTab === id && next.length > 0) {
        setActiveTab(next[next.length - 1].id);
      }
      return next;
    });
  }, [activeTab]);

  const handleStart = () => {
    if (instanceRefs.current[activeTab]) instanceRefs.current[activeTab].start();
  };
  const handleStop = () => {
    if (instanceRefs.current[activeTab]) instanceRefs.current[activeTab].stop();
  };
  const handleClear = () => {
    if (instanceRefs.current[activeTab]) instanceRefs.current[activeTab].clear();
  };

  // ── Explain Error: read terminal buffer and send to AI ──
  const handleExplainError = () => {
    const instance = instanceRefs.current[activeTab];
    if (!instance) return;
    // Read the raw xterm ref from the instance to grab buffer lines
    // We expose a getBuffer method on the instance
    let bufferText = '';
    try {
      // Access the underlying xterm terminal through the imperative ref chain
      const termContainer = document.querySelector(`[data-terminal-id="${activeTab}"]`);
      // Fallback: get visible text from the terminal buffer
      if (instance._getBuffer) {
        bufferText = instance._getBuffer();
      }
    } catch (e) {
      console.warn('Could not read terminal buffer:', e);
    }
    if (bufferText && onExplainError) {
      onExplainError(bufferText);
    } else if (onExplainError) {
      onExplainError('(Could not read terminal output. Please paste the error manually.)');
    }
  };

  return (
    <div
      className={`flex flex-col border-t border-surface-800 bg-[#0c0e14] ${!isVisible ? 'hidden' : ''}`}
      style={{ height: '250px' }}
    >
      {/* Tab bar */}
      <div className="flex items-center justify-between px-2 pt-1 border-b border-surface-800/50 bg-surface-900/80 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto">
          {terminals.map((t) => (
            <div
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium border-b-2 cursor-pointer transition-colors ${
                activeTab === t.id
                  ? 'border-hive-500 text-surface-200 bg-surface-800/50'
                  : 'border-transparent text-surface-500 hover:text-surface-300 hover:bg-surface-800/30'
              }`}
            >
              <TerminalIcon size={12} />
              {t.name}
              {terminals.length > 1 && (
                <button
                  onClick={(e) => handleCloseTab(e, t.id)}
                  className="ml-1 p-0.5 rounded-sm hover:bg-surface-700 text-surface-500 hover:text-surface-200"
                  title="Close Tab"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={handleCreateTerminal}
            className="p-1 ml-1 rounded hover:bg-surface-800 text-surface-400 hover:text-surface-200 transition-colors"
            title="New Terminal"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex items-center gap-1 pb-1">
          <button
            onClick={handleExplainError}
            className="px-2 py-0.5 text-[11px] font-medium rounded bg-violet-600/20 text-violet-400 hover:bg-violet-600/40 transition-colors flex items-center gap-1"
            title="Ask AI to explain terminal errors"
          >
            <Sparkles size={11} />
            Explain Error
          </button>
          <button
            onClick={handleStart}
            className="px-2 py-0.5 text-[11px] font-medium rounded bg-hive-600/20 text-hive-400 hover:bg-hive-600/40 transition-colors"
            title="Start Shell"
          >
            Start Shell
          </button>
          <button
            onClick={handleClear}
            className="p-1 rounded hover:bg-surface-800 text-surface-500 hover:text-surface-200 transition-colors"
            title="Clear"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={handleStop}
            className="p-1 rounded hover:bg-red-500/20 text-surface-500 hover:text-red-400 transition-colors"
            title="Stop Terminal"
          >
            <RotateCcw size={13} />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-800 text-surface-500 hover:text-surface-200 transition-colors"
            title="Close Panel"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Terminal instances */}
      {terminals.map((t) => (
        <TerminalInstance
          key={t.id}
          terminalId={t.id}
          ref={(el) => (instanceRefs.current[t.id] = el)}
          isVisible={activeTab === t.id && isVisible}
          emit={emit}
          isConnected={isConnected}
          onStop={() => {}}
        />
      ))}
    </div>
  );
});

TerminalPanel.displayName = 'TerminalPanel';
export default TerminalPanel;
