import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['room_created', 'room_joined', 'snapshot_saved', 'comment_added'],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fetching activities for a user's rooms quickly
activitySchema.index({ room: 1, createdAt: -1 });

const Activity = mongoose.model('Activity', activitySchema);
export default Activity;
