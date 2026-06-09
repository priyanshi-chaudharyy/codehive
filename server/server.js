import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { execSync } from 'child_process';

import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import codeRoutes from './routes/codeRoutes.js';
import githubRoutes from './routes/githubRoutes.js';
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
app.use('/api/github', githubRoutes);

// --- Web Preview Proxy ---
// Since terminal containers now use --network host for performance,
// any port opened in the terminal is directly available on 127.0.0.1
app.use('/proxy/:roomId/:port', (req, res, next) => {
  const { roomId, port } = req.params;
  try {
    const target = `http://127.0.0.1:${port}`;
    console.log(`[Proxy] Routing Preview for room ${roomId} -> ${target}`);
    
    const proxy = createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
      pathRewrite: {
        [`^/proxy/${roomId}/${port}`]: '',
      },
      logLevel: 'silent',
      onError: (err, req, res) => {
        res.status(502).send(`
          <html><body style="font-family:sans-serif;padding:40px;background:#1a1a2e;color:#e0e0e0">
            <h2 style="color:#ff6b6b">⚠️ Web Preview: Cannot reach port ${port}</h2>
            <p>The web server inside your terminal is not reachable. Common fixes:</p>
            <ol>
              <li>Make sure your dev server is running (e.g. <code>npm run dev</code>)</li>
              <li><strong>Bind to 0.0.0.0</strong> — run: <code>npx vite --host 0.0.0.0</code> or <code>npm run dev -- --host 0.0.0.0</code></li>
              <li>Confirm the port number matches what your server reports</li>
            </ol>
            <p style="color:#888">Error: ${err.message}</p>
          </body></html>
        `);
      }
    });

    return proxy(req, res, next);
  } catch (err) {
    return res.status(500).send('Proxy Error: ' + err.message);
  }
});

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
