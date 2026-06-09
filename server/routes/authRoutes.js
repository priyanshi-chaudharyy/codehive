import express from 'express';
import { signup, login, logout, getMe, githubAuth, githubCallback } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

// GitHub OAuth
router.get('/github', githubAuth);
router.get('/github/callback', githubCallback);

export default router;
