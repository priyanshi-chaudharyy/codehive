import api from './api';

export const roomService = {
  /**
   * Create a new room.
   * @param {{ name: string, language?: string, isPublic?: boolean, password?: string }} data
   */
  createRoom: async (data) => {
    return api.post('/rooms', data);
  },

  /**
   * Get all rooms for the current user.
   */
  getRooms: async () => {
    return api.get('/rooms');
  },

  /**
   * Get a single room by roomId.
   * @param {string} roomId
   */
  getRoom: async (roomId) => {
    return api.get(`/rooms/${roomId}`);
  },

  /**
   * Join an existing room.
   * @param {string} roomId
   * @param {{ password?: string }} data
   */
  joinRoom: async (roomId, data = {}) => {
    return api.post(`/rooms/${roomId}/join`, data);
  },

  /**
   * Delete a room (owner only).
   * @param {string} roomId
   */
  deleteRoom: async (roomId) => {
    return api.delete(`/rooms/${roomId}`);
  },
};
