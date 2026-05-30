import { Terminal, X, Clock, Cpu } from 'lucide-react';

/**
 * Output panel showing code execution results.
 */
const OutputPanel = ({ output, isExecuting, onClose, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="border-t border-surface-800/50 bg-surface-900/90 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-800/30">
        <div className="flex items-center gap-2 text-sm font-medium text-surface-300">
          <Terminal size={14} />
          <span>Output</span>
          {output?.status && (
            <span
              className={`badge text-xs ${
                output.status === 'Accepted'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {output.status}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Execution stats */}
          {output?.time && (
            <div className="flex items-center gap-1 text-xs text-surface-500">
              <Clock size={12} />
              <span>{output.time}s</span>
            </div>
          )}
          {output?.memory && (
            <div className="flex items-center gap-1 text-xs text-surface-500">
              <Cpu size={12} />
              <span>{(output.memory / 1024).toFixed(1)}MB</span>
            </div>
          )}

          <button
            onClick={onClose}
            className="text-surface-500 hover:text-surface-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-48 overflow-y-auto font-mono text-sm">
        {isExecuting ? (
          <div className="flex items-center gap-2 text-surface-400">
            <div className="w-4 h-4 border-2 border-surface-600 border-t-hive-500 rounded-full animate-spin" />
            <span>Running code...</span>
          </div>
        ) : output ? (
          <>
            {output.stdout && (
              <pre className="text-emerald-400 whitespace-pre-wrap">{output.stdout}</pre>
            )}
            {output.stderr && (
              <pre className="text-red-400 whitespace-pre-wrap mt-2">{output.stderr}</pre>
            )}
            {!output.stdout && !output.stderr && (
              <span className="text-surface-500">(no output)</span>
            )}
          </>
        ) : (
          <span className="text-surface-500">Run your code to see output here...</span>
        )}
      </div>
    </div>
  );
};

export default OutputPanel;
