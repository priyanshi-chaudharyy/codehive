import api from './api';

export const authService = {
  /**
   * Register a new user.
   * @param {{ name: string, email: string, password: string }} data
   */
  signup: async (data) => {
    return api.post('/auth/signup', data);
  },

  /**
   * Login user.
   * @param {{ email: string, password: string }} data
   */
  login: async (data) => {
    return api.post('/auth/login', data);
  },

  /**
   * Logout user.
   */
  logout: async () => {
    return api.post('/auth/logout');
  },

  /**
   * Get current user profile.
   */
  getMe: async () => {
    return api.get('/auth/me');
  },
};
