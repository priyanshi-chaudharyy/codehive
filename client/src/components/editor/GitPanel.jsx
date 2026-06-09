import { useState, useEffect } from 'react';
import { GitBranch, GitCommit, Upload, RefreshCw, FolderGit2, Check, ChevronDown, X, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { githubService } from '../../services/githubService';
import showToast from '../shared/Toast';

/**
 * GitPanel — sidebar panel for GitHub integration.
 * Allows importing repos, viewing linked repo info, and pushing changes.
 */
const GitPanel = ({ isVisible, onClose, roomId, roomData, user, files, onImportComplete }) => {
  const [repos, setRepos] = useState([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [showRepoList, setShowRepoList] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSearch, setImportSearch] = useState('');

  const isGitHubUser = user?.authProvider === 'github' || user?.githubUsername;
  const linkedRepo = roomData?.githubRepo;
  const isLinked = linkedRepo?.owner && linkedRepo?.name;

  const fetchRepos = async () => {
    setIsLoadingRepos(true);
    try {
      const data = await githubService.getRepos();
      setRepos(data.repos || []);
    } catch (err) {
      showToast.error(err.message || 'Failed to load repositories');
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleImport = async (repo) => {
    setIsImporting(true);
    try {
      const result = await githubService.importRepo(roomId, repo.owner, repo.name, repo.defaultBranch);
      showToast.success(result.message || 'Repository imported!');
      setShowRepoList(false);
      if (onImportComplete) onImportComplete();
    } catch (err) {
      showToast.error(err.message || 'Failed to import repository');
    } finally {
      setIsImporting(false);
    }
  };

  const handlePush = async () => {
    if (!commitMessage.trim()) {
      showToast.error('Please enter a commit message');
      return;
    }

    setIsPushing(true);
    try {
      const result = await githubService.pushChanges(roomId, commitMessage.trim());
      showToast.success(result.message || 'Changes pushed!');
      setCommitMessage('');
    } catch (err) {
      showToast.error(err.message || 'Failed to push changes');
    } finally {
      setIsPushing(false);
    }
  };

  const filteredRepos = repos.filter(r =>
    r.name.toLowerCase().includes(importSearch.toLowerCase()) ||
    r.fullName.toLowerCase().includes(importSearch.toLowerCase())
  );

  // Count actual files (not folders) for display
  const fileCount = Object.values(files).filter(f => f.type === 'file').length;

  if (!isVisible) return null;

  return (
    <div className="flex flex-col h-full bg-surface-950/80">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-800/50 shrink-0">
        <div className="flex items-center gap-2">
          <FolderGit2 size={14} className="text-hive-400" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">Git</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-surface-800 text-surface-500 hover:text-surface-200 transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* GitHub connection status */}
        {!isGitHubUser && (
          <div className="px-3 py-3 border-b border-surface-800/50">
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-300 leading-relaxed">
                Log in with GitHub to use Git features. Your current account isn't connected to GitHub.
              </div>
            </div>
          </div>
        )}

        {/* Linked Repository Info */}
        {isLinked && (
          <div className="px-3 py-3 border-b border-surface-800/50">
            <div className="text-[10px] uppercase tracking-wider text-surface-600 mb-2 font-medium">Linked Repository</div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-900/60 border border-surface-800/50">
              <GitBranch size={14} className="text-hive-400 shrink-0" />
              <div className="flex flex-col min-w-0">
                <a
                  href={`https://github.com/${linkedRepo.owner}/${linkedRepo.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-surface-200 font-medium truncate hover:text-hive-400 transition-colors flex items-center gap-1"
                >
                  {linkedRepo.owner}/{linkedRepo.name}
                  <ExternalLink size={10} className="shrink-0" />
                </a>
                <span className="text-[10px] text-surface-500">
                  branch: {linkedRepo.branch || 'main'}
                  {linkedRepo.lastSyncedAt && ` • synced ${new Date(linkedRepo.lastSyncedAt).toLocaleDateString()}`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Import Section */}
        {isGitHubUser && (
          <div className="px-3 py-3 border-b border-surface-800/50">
            <div className="text-[10px] uppercase tracking-wider text-surface-600 mb-2 font-medium">Import</div>
            <button
              onClick={() => { setShowRepoList(!showRepoList); if (!showRepoList && repos.length === 0) fetchRepos(); }}
              disabled={isImporting}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-surface-800/50 hover:bg-surface-800 border border-surface-800 text-xs text-surface-300 transition-colors disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <FolderGit2 size={13} />
                {isImporting ? 'Importing...' : 'Import from GitHub'}
              </span>
              <ChevronDown size={13} className={`transition-transform ${showRepoList ? 'rotate-180' : ''}`} />
            </button>

            {/* Repo list dropdown */}
            {showRepoList && (
              <div className="mt-2 rounded-lg border border-surface-800 bg-surface-900/90 max-h-64 overflow-hidden flex flex-col">
                {/* Search */}
                <div className="p-2 border-b border-surface-800/50">
                  <input
                    value={importSearch}
                    onChange={(e) => setImportSearch(e.target.value)}
                    placeholder="Search repos..."
                    className="w-full bg-surface-800 border border-surface-700 rounded px-2 py-1.5 text-[11px] text-white outline-none placeholder:text-surface-600"
                  />
                </div>

                <div className="overflow-y-auto flex-1">
                  {isLoadingRepos ? (
                    <div className="flex items-center justify-center py-6 text-surface-500">
                      <Loader2 size={16} className="animate-spin" />
                    </div>
                  ) : filteredRepos.length === 0 ? (
                    <div className="text-center py-6 text-[11px] text-surface-600">
                      {repos.length === 0 ? 'No repositories found' : 'No matching repos'}
                    </div>
                  ) : (
                    filteredRepos.map(repo => (
                      <button
                        key={repo.id}
                        onClick={() => handleImport(repo)}
                        disabled={isImporting}
                        className="w-full flex items-start gap-2 px-3 py-2 hover:bg-surface-800/60 transition-colors text-left disabled:opacity-50"
                      >
                        <GitBranch size={12} className="text-surface-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[11px] text-surface-200 font-medium truncate">{repo.name}</div>
                          <div className="text-[10px] text-surface-600 truncate">
                            {repo.description || 'No description'}
                            {repo.language && ` • ${repo.language}`}
                            {repo.isPrivate && ' • 🔒'}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {!isLoadingRepos && repos.length > 0 && (
                  <div className="p-1.5 border-t border-surface-800/50">
                    <button
                      onClick={fetchRepos}
                      className="w-full flex items-center justify-center gap-1 py-1 text-[10px] text-surface-500 hover:text-surface-300 transition-colors"
                    >
                      <RefreshCw size={10} /> Refresh
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Push Section */}
        {isLinked && isGitHubUser && (
          <div className="px-3 py-3">
            <div className="text-[10px] uppercase tracking-wider text-surface-600 mb-2 font-medium">Commit & Push</div>

            <div className="text-[11px] text-surface-400 mb-2">
              {fileCount} file{fileCount !== 1 ? 's' : ''} in workspace
            </div>

            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Commit message..."
              rows={2}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-[12px] text-white outline-none resize-none placeholder:text-surface-600 focus:border-hive-500 transition-colors mb-2"
            />

            <button
              onClick={handlePush}
              disabled={isPushing || !commitMessage.trim()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-hive-600/20 text-hive-400 hover:bg-hive-600/30 font-medium text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPushing ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Pushing...
                </>
              ) : (
                <>
                  <Upload size={13} />
                  Commit & Push
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GitPanel;
