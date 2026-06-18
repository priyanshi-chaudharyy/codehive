import User from '../models/User.js';
import Room from '../models/Room.js';
import Activity from '../models/Activity.js';

/**
 * @desc    Get dashboard stats for current user
 * @route   GET /api/users/stats
 * @access  Private
 */
export const getUserStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);

    // Get all rooms where user is an owner or participant
    const rooms = await Room.find({
      $or: [
        { owner: userId },
        { 'participants.userId': userId },
      ],
    });

    const totalProjects = rooms.length;
    
    // Count unique collaborators across all these rooms
    const collaboratorsSet = new Set();
    let commitsThisMonth = 0;
    
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    rooms.forEach(room => {
      // Collaborators
      room.participants.forEach(p => {
        if (p.userId && p.userId.toString() !== userId.toString()) {
          collaboratorsSet.add(p.userId.toString());
        }
      });
      
      // Commits this month
      room.snapshots.forEach(snapshot => {
        if (snapshot.savedBy && snapshot.savedBy.toString() === userId.toString()) {
          if (new Date(snapshot.savedAt) >= firstDayOfMonth) {
            commitsThisMonth++;
          }
        }
      });
    });

    res.json({
      success: true,
      stats: {
        totalProjects,
        totalCollaborators: collaboratorsSet.size,
        commitsThisMonth,
        totalTimeCoded: user.totalTimeCoded || 0,
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user activity feed
 * @route   GET /api/users/activity
 * @access  Private
 */
export const getUserActivity = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get rooms the user is part of
    const rooms = await Room.find({
      $or: [
        { owner: userId },
        { 'participants.userId': userId },
      ],
    }).select('_id');

    const roomIds = rooms.map(r => r._id);

    // Get recent activity for these rooms
    const activities = await Activity.find({ room: { $in: roomIds } })
      .populate('user', 'name avatar')
      .populate('room', 'name roomId')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      activities
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Ping to update total time coded
 * @route   POST /api/users/ping
 * @access  Private
 */
export const pingActive = async (req, res, next) => {
  try {
    const userId = req.user._id;
    // Client calls this every 60 seconds when active
    await User.findByIdAndUpdate(userId, {
      $inc: { totalTimeCoded: 60 }
    });
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
