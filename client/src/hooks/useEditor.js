import { useState, useCallback, useRef } from 'react';

/**
 * Hook for managing editor state — code, language, version, and OT operations.
 *
 * IMPORTANT: The editor runs in "uncontrolled" mode. We never pass a `value`
 * prop to `<Editor>` after mount. Instead we manipulate the model directly
 * via `executeEdits`. This eliminates the controlled-component race condition
 * that caused cursor jumping, ghost characters, and decoration loss.
 *
 * To read the current code, call `getCode()` which reads from the model.
 */
const useEditor = ({ initialCode = '', initialLanguage = 'javascript' } = {}) => {
  const [language, setLanguage] = useState(initialLanguage);
  const [version, setVersion] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [output, setOutput] = useState(null);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  /**
   * Counter-based remote change guard.
   * Incremented before each remote edit, decremented when onChange fires.
   * Prevents remote edits from being re-emitted as local operations.
   */
  const remoteChangeCounter = useRef(0);

  /**
   * Get the current code from the editor model.
   * This is the single source of truth — never stored in React state.
   */
  const getCode = useCallback(() => {
    const model = editorRef.current?.getModel();
    // Force LF line endings to match the server state and prevent OT drift mismatch
    return model ? model.getValue(1) : initialCode;
  }, [initialCode]);

  /**
   * Called when the Monaco editor mounts.
   */
  const handleEditorDidMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Set initial code if provided
    const model = editor.getModel();
    if (model) {
      // Force LF internally so rangeOffsets align with the server's string length
      model.setEOL(0 /* monaco.editor.EndOfLineSequence.LF */);
      
      if (initialCode && model.getValue() !== initialCode) {
        model.setValue(initialCode);
      }
    }
  }, [initialCode]);

  /**
   * Handle local code changes from Monaco.
   * Returns the change as OT-compatible operations.
   */
  const handleEditorChange = useCallback(
    (value, event) => {
      // If this change was caused by a remote operation, skip re-emitting
      if (remoteChangeCounter.current > 0) {
        remoteChangeCounter.current--;
        return null;
      }

      // Convert Monaco change events to OT operations
      const changes = event.changes.map((change) => {
        const { rangeOffset, rangeLength, text } = change;

        if (rangeLength > 0 && text.length > 0) {
          // Replace = delete + insert
          return [
            { type: 'delete', position: rangeOffset, length: rangeLength },
            { type: 'insert', position: rangeOffset, text },
          ];
        } else if (rangeLength > 0) {
          // Pure delete
          return [{ type: 'delete', position: rangeOffset, length: rangeLength }];
        } else if (text.length > 0) {
          // Pure insert
          return [{ type: 'insert', position: rangeOffset, text }];
        }
        return [];
      });

      return changes.flat();
    },
    []
  );

  /**
   * Apply a remote operation to the editor without triggering local change events.
   * Preserves the local user's cursor position and all decorations.
   */
  const applyRemoteOperation = useCallback(
    (operation) => {
      if (!editorRef.current) return;

      const editor = editorRef.current;
      const model = editor.getModel();
      if (!model) return;

      // Save current cursor selections before the edit
      const currentSelections = editor.getSelections();

      // Mark the next onChange as remote
      remoteChangeCounter.current++;

      if (operation.type === 'insert') {
        const position = model.getPositionAt(operation.position);
        editor.executeEdits('remote', [
          {
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
            text: operation.text,
          },
        ], currentSelections);
      } else if (operation.type === 'delete') {
        const startPos = model.getPositionAt(operation.position);
        const endPos = model.getPositionAt(operation.position + operation.length);
        editor.executeEdits('remote', [
          {
            range: {
              startLineNumber: startPos.lineNumber,
              startColumn: startPos.column,
              endLineNumber: endPos.lineNumber,
              endColumn: endPos.column,
            },
            text: '',
          },
        ], currentSelections);
      }

      // NO setCode() call — the model IS the source of truth.
    },
    []
  );

  /**
   * Set code from remote (full sync).
   * Uses executeEdits to preserve undo stack and cursor position.
   */
  const setRemoteCode = useCallback((newCode) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;

    const currentValue = model.getValue();
    if (currentValue === newCode) return; // No change needed

    // Save cursor position
    const currentSelections = editor.getSelections();

    // Mark the next onChange as remote
    remoteChangeCounter.current++;

    // Replace entire content using executeEdits (preserves undo stack)
    const fullRange = model.getFullModelRange();
    editor.executeEdits('remote-sync', [
      {
        range: fullRange,
        text: newCode,
      },
    ], currentSelections);
  }, []);

  return {
    language,
    version,
    output,
    isExecuting,
    getCode,
    setLanguage,
    setVersion,
    setOutput,
    setIsExecuting,
    editorRef,
    monacoRef,
    handleEditorDidMount,
    handleEditorChange,
    applyRemoteOperation,
    setRemoteCode,
  };
};

export default useEditor;
