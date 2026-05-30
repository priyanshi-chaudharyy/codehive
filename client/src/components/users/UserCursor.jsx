/**
 * Remote user cursor decoration for Monaco Editor.
 *
 * This component doesn't render DOM directly — it manages Monaco editor
 * decorations for remote user cursors via the editor API.
 *
 * Usage is primarily through the useEditor hook, which calls these
 * utility functions to add/remove/update cursor decorations.
 */

/**
 * Create a CSS style tag for a user's cursor color.
 * @param {string} userId
 * @param {string} color
 * @param {string} userName
 */
export const injectCursorStyles = (cursorKey, color, userName) => {
  const styleId = `cursor-style-${cursorKey}`;

  // Don't duplicate
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .cursor-${cursorKey} {
      background-color: ${color}40;
      border-left: 2px solid ${color};
    }
    .cursor-label-${cursorKey}::before {
      content: '${userName}';
      position: absolute;
      top: -18px;
      left: -2px;
      background-color: ${color};
      color: white;
      font-size: 10px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 4px 4px 4px 0;
      white-space: nowrap;
      pointer-events: none;
      z-index: 10;
    }
  `;
  document.head.appendChild(style);
};

/**
 * Remove cursor styles for a user.
 * @param {string} userId
 */
export const removeCursorStyles = (cursorKey) => {
  const style = document.getElementById(`cursor-style-${cursorKey}`);
  if (style) style.remove();
};

/**
 * Apply cursor decoration in the Monaco editor.
 * @param {Object} editor - Monaco editor instance
 * @param {Object} monaco - Monaco namespace
 * @param {string} userId
 * @param {{ lineNumber: number, column: number }} position
 * @param {string[]} existingDecorations - Previous decoration IDs to replace
 * @returns {string[]} New decoration IDs
 */
export const applyCursorDecoration = (editor, monaco, cursorKey, position, existingDecorations = []) => {
  if (!editor || !monaco || !position) return [];

  return editor.deltaDecorations(existingDecorations, [
    {
      range: new monaco.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column
      ),
      options: {
        className: `cursor-${cursorKey}`,
        beforeContentClassName: `cursor-label-${cursorKey}`,
        stickiness: 1, // AlwaysGrowsWhenTypingAtEdges
      },
    },
  ]);
};

/**
 * Clear cursor decorations.
 * @param {Object} editor - Monaco editor instance
 * @param {string[]} existingDecorations - Decorations to remove
 */
export const clearCursorDecoration = (editor, existingDecorations = []) => {
  if (!editor || existingDecorations.length === 0) return [];
  return editor.deltaDecorations(existingDecorations, []);
};

// Empty component for import compatibility
const UserCursor = () => null;
export default UserCursor;
