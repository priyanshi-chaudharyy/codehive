import axios from 'axios';

const GITHUB_API = 'https://api.github.com';

/**
 * GitHub Service — wraps the GitHub REST API for OAuth and repo operations.
 */

/**
 * Exchange an OAuth authorization code for an access token.
 */
export const exchangeCodeForToken = async (code) => {
  const response = await axios.post(
    'https://github.com/login/oauth/access_token',
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    },
    {
      headers: { Accept: 'application/json' },
    }
  );

  if (response.data.error) {
    throw new Error(response.data.error_description || 'Failed to exchange code for token');
  }

  return response.data.access_token;
};

/**
 * Get the authenticated GitHub user's profile.
 */
export const getGitHubUser = async (accessToken) => {
  const response = await axios.get(`${GITHUB_API}/user`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
};

/**
 * List the authenticated user's repositories.
 */
export const getUserRepos = async (accessToken, page = 1, perPage = 30) => {
  const response = await axios.get(`${GITHUB_API}/user/repos`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: {
      sort: 'updated',
      direction: 'desc',
      per_page: perPage,
      page,
      type: 'all',
    },
  });
  return response.data;
};

/**
 * Get the file tree of a repository recursively.
 * Uses the Git Trees API for efficiency (single request for full tree).
 */
export const getRepoTree = async (accessToken, owner, repo, branch = 'main') => {
  try {
    const response = await axios.get(
      `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return response.data.tree || [];
  } catch (err) {
    // Try 'master' branch if 'main' fails
    if (branch === 'main') {
      const response = await axios.get(
        `${GITHUB_API}/repos/${owner}/${repo}/git/trees/master?recursive=1`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return response.data.tree || [];
    }
    throw err;
  }
};

/**
 * Get the content of a single file from a repository.
 */
export const getFileContent = async (accessToken, owner, repo, path, branch = 'main') => {
  try {
    const response = await axios.get(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { ref: branch },
      }
    );

    if (response.data.encoding === 'base64') {
      return Buffer.from(response.data.content, 'base64').toString('utf-8');
    }
    return response.data.content || '';
  } catch (err) {
    return ''; // File might be binary or too large
  }
};

/**
 * Create a commit with multiple file changes using the Git Trees API.
 * This is the most efficient way to push multiple files in a single commit.
 */
export const createCommit = async (accessToken, owner, repo, files, message, branch = 'main') => {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const baseUrl = `${GITHUB_API}/repos/${owner}/${repo}`;

  // 1. Get the latest commit SHA on the branch
  const refResponse = await axios.get(`${baseUrl}/git/ref/heads/${branch}`, { headers });
  const latestCommitSha = refResponse.data.object.sha;

  // 2. Get the tree SHA of the latest commit
  const commitResponse = await axios.get(`${baseUrl}/git/commits/${latestCommitSha}`, { headers });
  const baseTreeSha = commitResponse.data.tree.sha;

  // 3. Create blobs for each file
  const treeItems = [];
  for (const file of files) {
    const blobResponse = await axios.post(
      `${baseUrl}/git/blobs`,
      {
        content: file.content,
        encoding: 'utf-8',
      },
      { headers }
    );

    treeItems.push({
      path: file.path,
      mode: '100644', // regular file
      type: 'blob',
      sha: blobResponse.data.sha,
    });
  }

  // 4. Create a new tree
  const treeResponse = await axios.post(
    `${baseUrl}/git/trees`,
    {
      base_tree: baseTreeSha,
      tree: treeItems,
    },
    { headers }
  );

  // 5. Create a new commit
  const newCommitResponse = await axios.post(
    `${baseUrl}/git/commits`,
    {
      message,
      tree: treeResponse.data.sha,
      parents: [latestCommitSha],
    },
    { headers }
  );

  // 6. Update the branch reference
  await axios.patch(
    `${baseUrl}/git/refs/heads/${branch}`,
    {
      sha: newCommitResponse.data.sha,
    },
    { headers }
  );

  return {
    commitSha: newCommitResponse.data.sha,
    commitUrl: newCommitResponse.data.html_url,
  };
};
