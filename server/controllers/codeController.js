import { executeCode } from '../utils/codeExecutor.js';
import Room from '../models/Room.js';

/**
 * @desc    Execute code using Judge0 API (or mock executor)
 * @route   POST /api/code/execute
 * @access  Private
 */
export const runCode = async (req, res, next) => {
  try {
    const { code, language } = req.body;

    if (!code) {
      res.status(400);
      throw new Error('Code is required');
    }

    if (!language) {
      res.status(400);
      throw new Error('Language is required');
    }

    const result = await executeCode(code, language);

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Save a code snapshot for a room
 * @route   POST /api/code/snapshot/:roomId
 * @access  Private
 */
export const saveSnapshot = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { code, language } = req.body;

    const room = await Room.findOne({ roomId });

    if (!room) {
      res.status(404);
      throw new Error('Room not found');
    }

    // Add snapshot
    room.snapshots.push({
      code,
      language: language || room.language,
      savedBy: req.user._id,
    });

    // Update current code state
    room.code = code;
    await room.save();

    res.json({
      success: true,
      message: 'Snapshot saved',
      snapshot: room.snapshots[room.snapshots.length - 1],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all snapshots for a room
 * @route   GET /api/code/snapshots/:roomId
 * @access  Private
 */
export const getSnapshots = async (req, res, next) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId })
      .select('snapshots')
      .populate('snapshots.savedBy', 'name');

    if (!room) {
      res.status(404);
      throw new Error('Room not found');
    }

    res.json({
      success: true,
      snapshots: room.snapshots.sort((a, b) => b.savedAt - a.savedAt),
    });
  } catch (error) {
    next(error);
  }
};
