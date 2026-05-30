import api from './api';

export const codeService = {
  /**
   * Execute code on the server.
   * @param {{ code: string, language: string }} data
   */
  executeCode: async (data) => {
    return api.post('/code/execute', data);
  },

  /**
   * Save a code snapshot for a room.
   * @param {string} roomId
   * @param {{ code: string, language?: string }} data
   */
  saveSnapshot: async (roomId, data) => {
    return api.post(`/code/snapshot/${roomId}`, data);
  },

  /**
   * Get all snapshots for a room.
   * @param {string} roomId
   */
  getSnapshots: async (roomId) => {
    return api.get(`/code/snapshots/${roomId}`);
  },
};
