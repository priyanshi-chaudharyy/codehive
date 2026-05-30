import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import codeRoutes from './routes/codeRoutes.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import { initializeSocket } from './socket/socketHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: function (origin, callback) {
    // Dynamically allow the requesting origin to bypass CORS completely
    callback(null, origin || true);
  },
  credentials: true,
};

// Socket.io setup
const io = new Server(server, {
  cors: corsOptions,
});

// --- Middleware ---
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- API Routes ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/code', codeRoutes);

// --- Error Handling ---
app.use(notFound);
app.use(errorHandler);

// --- Socket.io ---
initializeSocket(io);

// --- Database & Server Start ---
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/codehive')
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

export { io };
