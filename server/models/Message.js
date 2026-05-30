import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: [true, 'Room ID is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    userName: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Message text is required'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    type: {
      type: String,
      enum: ['text', 'system', 'code'],
      default: 'text',
    },
  },
  {
    timestamps: true,
  }
);

// Index for fetching messages by room in order
messageSchema.index({ roomId: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
