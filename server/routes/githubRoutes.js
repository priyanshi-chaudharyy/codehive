import express from 'express';
import { listRepos, importRepo, pushChanges } from '../controllers/githubController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/repos', protect, listRepos);
router.post('/import', protect, importRepo);
router.post('/push', protect, pushChanges);

export default router;
