import User from '../models/User.js';
import Room from '../models/Room.js';
import { getUserRepos, getRepoTree, getFileContent, createCommit } from '../utils/githubService.js';

/**
 * @desc    List user's GitHub repositories
 * @route   GET /api/github/repos
 * @access  Private
 */
export const listRepos = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+githubAccessToken');

    if (!user?.githubAccessToken) {
      return res.status(400).json({
        success: false,
        message: 'GitHub account not connected. Please log in with GitHub first.',
      });
    }

    const page = parseInt(req.query.page) || 1;
    const repos = await getUserRepos(user.githubAccessToken, page);

    res.json({
      success: true,
      repos: repos.map(r => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        owner: r.owner.login,
        description: r.description,
        language: r.language,
        isPrivate: r.private,
        defaultBranch: r.default_branch,
        updatedAt: r.updated_at,
        stargazersCount: r.stargazers_count,
        url: r.html_url,
      })),
    });
  } catch (error) {
    console.error('Error listing repos:', error.message);
    next(error);
  }
};

/**
 * @desc    Import a GitHub repository into a CodeHive room
 * @route   POST /api/github/import
 * @access  Private
 */
export const importRepo = async (req, res, next) => {
  try {
    const { roomId, owner, repo, branch } = req.body;
    const user = await User.findById(req.user._id).select('+githubAccessToken');

    if (!user?.githubAccessToken) {
      return res.status(400).json({
        success: false,
        message: 'GitHub account not connected.',
      });
    }

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const actualBranch = branch || 'main';

    // Get the full file tree
    const tree = await getRepoTree(user.githubAccessToken, owner, repo, actualBranch);

    // Filter to only blobs (files) that are reasonable size (< 500KB)
    // and skip binary/image files
    const skipExtensions = new Set([
      'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'svg', 'webp',
      'mp3', 'mp4', 'wav', 'avi', 'mov',
      'zip', 'tar', 'gz', 'rar', '7z',
      'exe', 'dll', 'so', 'dylib',
      'woff', 'woff2', 'ttf', 'eot', 'otf',
      'pdf', 'doc', 'docx', 'xls', 'xlsx',
      'lock', // package-lock, yarn.lock
    ]);

    const skipPaths = ['node_modules/', '.git/', 'dist/', 'build/', '.next/', '__pycache__/'];

    const fileEntries = tree.filter(item => {
      if (item.type !== 'blob') return false;
      if (item.size > 500000) return false; // Skip files > 500KB

      const ext = item.path.split('.').pop()?.toLowerCase();
      if (skipExtensions.has(ext)) return false;

      if (skipPaths.some(skip => item.path.startsWith(skip))) return false;

      return true;
    });

    // Limit to 100 files max to avoid overwhelming the system
    const filesToImport = fileEntries.slice(0, 100);

    // Build the files map
    const filesMap = new Map();
    const folderIds = new Map();
    let fileCount = 0;

    // First pass: create folders
    const folderPaths = new Set();
    filesToImport.forEach(file => {
      const parts = file.path.split('/');
      for (let i = 0; i < parts.length - 1; i++) {
        const folderPath = parts.slice(0, i + 1).join('/');
        folderPaths.add(folderPath);
      }
    });

    folderPaths.forEach(folderPath => {
      const parts = folderPath.split('/');
      const folderId = `folder-${folderPath.replace(/\//g, '-')}`;
      const parentPath = parts.slice(0, -1).join('/');
      const parentId = parentPath ? `folder-${parentPath.replace(/\//g, '-')}` : null;

      folderIds.set(folderPath, folderId);
      filesMap.set(folderId, {
        name: parts[parts.length - 1],
        type: 'folder',
        parentId,
        content: '',
        language: 'javascript',
      });
    });

    // Second pass: create files and fetch content
    for (const file of filesToImport) {
      const parts = file.path.split('/');
      const fileName = parts[parts.length - 1];
      const parentPath = parts.slice(0, -1).join('/');
      const parentId = parentPath ? folderIds.get(parentPath) : null;

      const ext = fileName.split('.').pop()?.toLowerCase();
      const langMap = {
        js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
        py: 'python', java: 'java', cpp: 'cpp', c: 'c', go: 'go',
        rs: 'rust', rb: 'ruby', php: 'php', cs: 'csharp', kt: 'kotlin', swift: 'swift',
      };

      let content = '';
      try {
        content = await getFileContent(user.githubAccessToken, owner, repo, file.path, actualBranch);
      } catch (err) {
        content = `// Failed to load: ${file.path}`;
      }

      const fileId = `gh-${file.path.replace(/\//g, '-').replace(/\./g, '_')}`;
      filesMap.set(fileId, {
        name: fileName,
        type: 'file',
        parentId,
        content,
        language: langMap[ext] || 'javascript',
      });
      fileCount++;
    }

    // Save to room
    room.files = filesMap;
    room.githubRepo = {
      owner,
      name: repo,
      branch: actualBranch,
      lastSyncedAt: new Date(),
    };
    await room.save();

    res.json({
      success: true,
      message: `Imported ${fileCount} files from ${owner}/${repo}`,
      filesCount: fileCount,
      foldersCount: folderPaths.size,
    });
  } catch (error) {
    console.error('Error importing repo:', error.message);
    next(error);
  }
};

/**
 * @desc    Push room files back to the linked GitHub repository
 * @route   POST /api/github/push
 * @access  Private
 */
export const pushChanges = async (req, res, next) => {
  try {
    const { roomId, message } = req.body;
    const user = await User.findById(req.user._id).select('+githubAccessToken');

    if (!user?.githubAccessToken) {
      return res.status(400).json({
        success: false,
        message: 'GitHub account not connected.',
      });
    }

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (!room.githubRepo?.owner || !room.githubRepo?.name) {
      return res.status(400).json({
        success: false,
        message: 'This room is not linked to a GitHub repository.',
      });
    }

    const { owner, name: repoName, branch } = room.githubRepo;

    // Build file list from room's files map (only actual files, not folders)
    const filesToPush = [];

    // Reconstruct the file path from the folder hierarchy
    const buildPath = (fileId, filesMap) => {
      const file = filesMap.get(fileId);
      if (!file) return file?.name || '';

      const parts = [file.name];
      let currentId = file.parentId;
      while (currentId) {
        const parent = filesMap.get(currentId);
        if (!parent) break;
        parts.unshift(parent.name);
        currentId = parent.parentId;
      }
      return parts.join('/');
    };

    for (const [fileId, fileData] of room.files.entries()) {
      if (fileData.type === 'file') {
        const path = buildPath(fileId, room.files);
        filesToPush.push({
          path,
          content: fileData.content || '',
        });
      }
    }

    if (filesToPush.length === 0) {
      return res.status(400).json({ success: false, message: 'No files to push.' });
    }

    const commitMessage = message || `Update from CodeHive (${new Date().toISOString()})`;
    const result = await createCommit(user.githubAccessToken, owner, repoName, filesToPush, commitMessage, branch);

    // Update last synced time
    room.githubRepo.lastSyncedAt = new Date();
    await room.save();

    res.json({
      success: true,
      message: `Pushed ${filesToPush.length} files to ${owner}/${repoName}`,
      commitSha: result.commitSha,
      commitUrl: result.commitUrl,
    });
  } catch (error) {
    console.error('Error pushing changes:', error.message);
    next(error);
  }
};
