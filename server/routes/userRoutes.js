import express from 'express';
import {
  getUserStats,
  getUserActivity,
  pingActive,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/stats', getUserStats);
router.get('/activity', getUserActivity);
router.post('/ping', pingActive);

export default router;
