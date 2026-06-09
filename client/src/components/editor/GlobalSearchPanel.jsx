import { useState, useMemo, useEffect } from 'react';
import { Search, X, ChevronRight, ChevronDown, FileText } from 'lucide-react';
import { getLanguageFromName } from './FileExplorer';

const GlobalSearchPanel = ({ isVisible, onClose, files, onSelectMatch }) => {
  const [query, setQuery] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState({});

  // Auto-expand all files when search results change
  useEffect(() => {
    setExpandedFiles({});
  }, [query]);

  const toggleExpand = (fileId) => {
    setExpandedFiles(prev => ({
      ...prev,
      [fileId]: prev[fileId] !== undefined ? !prev[fileId] : false
    }));
  };

  const results = useMemo(() => {
    if (!query.trim()) return [];

    let searchRegex;
    try {
      const flags = matchCase ? 'g' : 'gi';
      // Escape string if not regex mode
      const pattern = useRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      searchRegex = new RegExp(pattern, flags);
    } catch (e) {
      return []; // Invalid regex
    }

    const matches = [];

    Object.entries(files).forEach(([id, file]) => {
      if (file.type !== 'file' || !file.content) return;

      const fileMatches = [];
      const lines = file.content.split('\n');

      lines.forEach((line, index) => {
        searchRegex.lastIndex = 0; // Reset index for global regex
        let match;
        while ((match = searchRegex.exec(line)) !== null) {
          fileMatches.push({
            lineNumber: index + 1,
            column: match.index + 1,
            lineText: line,
            matchText: match[0]
          });
        }
      });

      if (fileMatches.length > 0) {
        matches.push({
          fileId: id,
          fileName: file.name,
          matches: fileMatches
        });
      }
    });

    return matches;
  }, [query, files, useRegex, matchCase]);

  if (!isVisible) return null;

  return (
    <div className="flex flex-col h-full bg-surface-950/80 w-64 animate-slide-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800/50 shrink-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-surface-200">
          <Search size={16} className="text-surface-400" />
          <span>Search</span>
        </div>
        <button onClick={onClose} className="text-surface-500 hover:text-surface-300">
          <X size={16} />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-surface-800/50 shrink-0">
        <div className="relative flex items-center bg-surface-900 border border-surface-700 rounded-md focus-within:border-hive-500 transition-colors">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full bg-transparent text-sm text-white px-2 py-1.5 outline-none placeholder-surface-500"
            autoFocus
          />
          <div className="flex items-center pr-1 gap-0.5">
            <button
              onClick={() => setMatchCase(!matchCase)}
              className={`p-1 rounded text-xs font-mono font-bold leading-none ${matchCase ? 'bg-hive-500/20 text-hive-400' : 'text-surface-500 hover:text-surface-300'}`}
              title="Match Case"
            >
              Aa
            </button>
            <button
              onClick={() => setUseRegex(!useRegex)}
              className={`p-1 rounded text-xs font-mono font-bold leading-none ${useRegex ? 'bg-hive-500/20 text-hive-400' : 'text-surface-500 hover:text-surface-300'}`}
              title="Use Regular Expression"
            >
              .*
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {!query.trim() ? (
          <div className="p-4 text-center text-sm text-surface-500">
            Type to search across all files
          </div>
        ) : results.length === 0 ? (
          <div className="p-4 text-center text-sm text-surface-500">
            No results found
          </div>
        ) : (
          <div className="py-2">
            {results.map((result) => {
              const isExpanded = expandedFiles[result.fileId] !== false; // Default true
              
              return (
                <div key={result.fileId} className="mb-1">
                  {/* File Header */}
                  <div
                    className="flex items-center gap-1.5 px-2 py-1 text-sm cursor-pointer hover:bg-surface-800/60 text-surface-300"
                    onClick={() => toggleExpand(result.fileId)}
                  >
                    {isExpanded ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />}
                    <FileText size={14} className="shrink-0 text-surface-500" />
                    <span className="truncate">{result.fileName}</span>
                    <span className="ml-auto text-xs bg-surface-800 px-1.5 rounded-full text-surface-400 shrink-0">
                      {result.matches.length}
                    </span>
                  </div>

                  {/* Matches */}
                  {isExpanded && (
                    <div className="flex flex-col">
                      {result.matches.map((match, idx) => (
                        <div
                          key={idx}
                          className="group flex items-start gap-2 pl-7 pr-2 py-0.5 text-xs cursor-pointer hover:bg-surface-800/80 transition-colors"
                          onClick={() => onSelectMatch(result.fileId, match)}
                        >
                          <span className="text-surface-600 font-mono shrink-0 w-6 text-right">
                            {match.lineNumber}
                          </span>
                          <span className="text-surface-400 truncate flex-1 font-mono">
                            {/* Truncate long lines, highlight match */}
                            {match.lineText.length > 100 
                              ? match.lineText.substring(0, 100) + '...'
                              : match.lineText}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalSearchPanel;
