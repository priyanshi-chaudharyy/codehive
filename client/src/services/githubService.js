import api from './api';

export const githubService = {
  /**
   * Get the authenticated user's GitHub repos.
   */
  getRepos: async (page = 1) => {
    return api.get(`/github/repos?page=${page}`);
  },

  /**
   * Import a GitHub repository into a CodeHive room.
   */
  importRepo: async (roomId, owner, repo, branch) => {
    return api.post('/github/import', { roomId, owner, repo, branch });
  },

  /**
   * Push room files to the linked GitHub repository.
   */
  pushChanges: async (roomId, message) => {
    return api.post('/github/push', { roomId, message });
  },
};
