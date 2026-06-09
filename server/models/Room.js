import mongoose from 'mongoose';
import crypto from 'crypto';

const participantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: { type: String, required: true },
    color: {
      type: String,
      default: function () {
        const colors = [
          '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
          '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
          '#BB8FCE', '#85C1E9', '#F0B27A', '#82E0AA',
        ];
        return colors[Math.floor(Math.random() * colors.length)];
      },
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const snapshotSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    language: { type: String },
    savedAt: { type: Date, default: Date.now },
    savedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: true }
);

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      unique: true,
      default: function () {
        // Generate a short readable room ID like "abc-1x3z"
        const part1 = crypto.randomBytes(3).toString('hex').slice(0, 3);
        const part2 = crypto.randomBytes(3).toString('hex').slice(0, 4);
        return `${part1}-${part2}`;
      },
    },
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
      maxlength: [100, 'Room name cannot exceed 100 characters'],
    },
    language: {
      type: String,
      default: 'javascript',
      enum: [
        'javascript', 'typescript', 'python', 'java',
        'cpp', 'c', 'csharp', 'go', 'rust', 'ruby',
        'php', 'swift', 'kotlin',
      ],
    },
    files: {
      type: Map,
      of: new mongoose.Schema({
        name: { type: String, required: true },
        type: { type: String, enum: ['file', 'folder'], default: 'file' },
        parentId: { type: String, default: null },
        content: { type: String, default: '' },
        language: { type: String, default: 'javascript' },
      }, { _id: false }),
      default: () => ({
        'main': { name: 'main.js', type: 'file', parentId: null, content: '// Start coding here...\n', language: 'javascript' }
      })
    },
    code: {
      type: String,
      default: '// Start coding here...\n',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    participants: [participantSchema],
    isPublic: {
      type: Boolean,
      default: true,
    },
    password: {
      type: String,
      default: null,
    },
    snapshots: [snapshotSchema],
    githubRepo: {
      owner: { type: String, default: null },
      name: { type: String, default: null },
      branch: { type: String, default: 'main' },
      lastSyncedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast lookups
roomSchema.index({ owner: 1 });

const Room = mongoose.model('Room', roomSchema);
export default Room;
