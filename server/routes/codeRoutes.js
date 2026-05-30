import express from 'express';
import { runCode, saveSnapshot, getSnapshots } from '../controllers/codeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All code routes require authentication
router.use(protect);

router.post('/execute', runCode);
router.post('/snapshot/:roomId', saveSnapshot);
router.get('/snapshots/:roomId', getSnapshots);

export default router;
