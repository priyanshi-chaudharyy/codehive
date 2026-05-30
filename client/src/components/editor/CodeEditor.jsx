import Editor from '@monaco-editor/react';
import Loader from '../shared/Loader';

/**
 * Monaco Editor wrapper component.
 *
 * UNCONTROLLED MODE: We do NOT pass `value` to the editor after initial mount.
 * All code changes (local and remote) go through the model directly via
 * executeEdits. This prevents the controlled-component race condition.
 *
 * The `defaultValue` prop sets the initial content on mount only.
 */
const CodeEditor = ({ language, onChange, onMount, onRun, onSave, onShareSnippet, onToggleChat, onToggleOutput }) => {
  const handleMount = (editor, monaco) => {
    // ── Keyboard Shortcuts ──────────────────────────────────────────────

    // Ctrl+Enter → Run code
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => onRun?.()
    );

    // Ctrl+S → Save snapshot (override browser save dialog)
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => onSave?.()
    );

    // Ctrl+Shift+S → Share selected code as snippet in chat
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS,
      () => onShareSnippet?.()
    );

    // Ctrl+` (Backtick) → Toggle output panel
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backquote,
      () => onToggleOutput?.()
    );

    // Ctrl+Shift+C → Toggle chat panel
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyC,
      () => onToggleChat?.()
    );

    // Call parent mount handler
    onMount?.(editor, monaco);
  };

  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-surface-800/50">
      <Editor
        height="100%"
        language={language}
        defaultValue=""
        theme="vs-dark"
        onChange={onChange}
        onMount={handleMount}
        loading={<Loader text="Loading editor..." />}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontLigatures: true,
          wordWrap: 'on',
          automaticLayout: true,
          scrollBeyondLastLine: false,
          padding: { top: 16, bottom: 16 },
          lineNumbers: 'on',
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          suggest: {
            showMethods: true,
            showFunctions: true,
            showConstructors: true,
            showFields: true,
            showVariables: true,
            showClasses: true,
            showStructs: true,
            showInterfaces: true,
            showModules: true,
            showProperties: true,
            showEvents: true,
            showOperators: true,
            showUnits: true,
            showValues: true,
            showConstants: true,
            showEnums: true,
            showEnumMembers: true,
            showKeywords: true,
            showWords: true,
            showColors: true,
            showFiles: true,
            showReferences: true,
          },
        }}
      />
    </div>
  );
};

export default CodeEditor;
