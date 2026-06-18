import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: false, // Not required for GitHub OAuth users
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    avatar: {
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
    avatarUrl: {
      type: String,
      default: null, // GitHub profile picture URL
    },
    // ─── GitHub OAuth Fields ────────────────────────────────
    authProvider: {
      type: String,
      enum: ['local', 'github'],
      default: 'local',
    },
    githubId: {
      type: String,
      unique: true,
      sparse: true, // Allow null for non-GitHub users
    },
    githubUsername: {
      type: String,
      default: null,
    },
    githubAccessToken: {
      type: String,
      select: false, // Never return token by default
      default: null,
    },
    // ────────────────────────────────────────────────────────
    rooms: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
      },
    ],
    starredRooms: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
      },
    ],
    totalTimeCoded: {
      type: Number,
      default: 0, // Stored in seconds
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving (only for local auth)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false; // GitHub users have no password
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.githubAccessToken;
  return user;
};

const User = mongoose.model('User', userSchema);
export default User;
