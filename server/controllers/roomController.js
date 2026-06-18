import Room from '../models/Room.js';
import User from '../models/User.js';
import Activity from '../models/Activity.js';
import roomManager from '../socket/roomManager.js';

/**
 * @desc    Create a new room
 * @route   POST /api/rooms
 * @access  Private
 */
export const createRoom = async (req, res, next) => {
  try {
    const { name, language, isPublic, password } = req.body;

    const room = await Room.create({
      name,
      language: language || 'javascript',
      owner: req.user._id,
      isPublic: isPublic !== false,
      password: password || null,
      participants: [
        {
          userId: req.user._id,
          name: req.user.name,
        },
      ],
    });

    // Add room to user's rooms list
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { rooms: room._id },
    });

    // Log activity
    await Activity.create({
      room: room._id,
      user: req.user._id,
      type: 'room_created',
      description: 'created the room'
    });

    res.status(201).json({
      success: true,
      room,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all rooms for the current user
 * @route   GET /api/rooms
 * @access  Private
 */
export const getRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({
      $or: [
        { owner: req.user._id },
        { 'participants.userId': req.user._id },
      ],
    })
      .populate('owner', 'name email avatar')
      .sort({ updatedAt: -1 });

    const user = await User.findById(req.user._id);
    const starredSet = new Set((user.starredRooms || []).map(id => id.toString()));

    const roomsWithDetails = rooms.map(room => {
      const isStarred = starredSet.has(room._id.toString());
      const onlineCount = roomManager.getRoomState(room.roomId)?.users?.size || 0;
      return { ...room.toJSON(), isStarred, onlineCount };
    });

    res.json({
      success: true,
      count: roomsWithDetails.length,
      rooms: roomsWithDetails,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single room by roomId
 * @route   GET /api/rooms/:roomId
 * @access  Private
 */
export const getRoom = async (req, res, next) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId })
      .populate('owner', 'name email avatar')
      .populate('participants.userId', 'name email avatar');

    if (!room) {
      res.status(404);
      throw new Error('Room not found');
    }

    res.json({
      success: true,
      room,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Join an existing room
 * @route   POST /api/rooms/:roomId/join
 * @access  Private
 */
export const joinRoom = async (req, res, next) => {
  try {
    const { password } = req.body;
    const room = await Room.findOne({ roomId: req.params.roomId });

    if (!room) {
      res.status(404);
      throw new Error('Room not found');
    }

    // Check password if room is private
    if (!room.isPublic && room.password && room.password !== password) {
      res.status(403);
      throw new Error('Incorrect room password');
    }

    // Use atomic update to prevent race conditions if user double-clicks
    const updatedRoom = await Room.findOneAndUpdate(
      { 
        _id: room._id, 
        'participants.userId': { $ne: req.user._id } 
      },
      {
        $push: {
          participants: {
            userId: req.user._id,
            name: req.user.name,
          }
        }
      },
      { new: true }
    );

    if (updatedRoom) {
      // Add room to user's rooms list
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { rooms: room._id },
      });

      // Log activity
      await Activity.create({
        room: room._id,
        user: req.user._id,
        type: 'room_joined',
        description: 'joined the room'
      });
    }

    res.json({
      success: true,
      room,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a room (owner only)
 * @route   DELETE /api/rooms/:roomId
 * @access  Private
 */
export const deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });

    if (!room) {
      res.status(404);
      throw new Error('Room not found');
    }

    if (room.owner.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Only the room owner can delete this room');
    }

    // Remove room from all users' room lists
    await User.updateMany(
      { rooms: room._id },
      { $pull: { rooms: room._id } }
    );

    await Room.deleteOne({ _id: room._id });

    res.json({
      success: true,
      message: 'Room deleted',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle star status for a room
 * @route   PUT /api/rooms/:roomId/star
 * @access  Private
 */
export const toggleStarRoom = async (req, res, next) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) {
      res.status(404);
      throw new Error('Room not found');
    }

    const user = await User.findById(req.user._id);
    const isStarred = user.starredRooms.includes(room._id);

    if (isStarred) {
      user.starredRooms.pull(room._id);
    } else {
      user.starredRooms.push(room._id);
    }
    
    await user.save();

    res.json({
      success: true,
      isStarred: !isStarred,
    });
  } catch (error) {
    next(error);
  }
};
