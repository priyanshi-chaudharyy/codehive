import express from 'express';
import {
  createRoom,
  getRooms,
  getRoom,
  joinRoom,
  deleteRoom,
  toggleStarRoom,
} from '../controllers/roomController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All room routes require authentication
router.use(protect);

router.route('/').get(getRooms).post(createRoom);
router.route('/:roomId').get(getRoom).delete(deleteRoom);
router.post('/:roomId/join', joinRoom);
router.put('/:roomId/star', toggleStarRoom);

export default router;
