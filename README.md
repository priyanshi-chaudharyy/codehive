# CodeHive

CodeHive is a real-time collaborative browser-based IDE that enables multiple developers to simultaneously write, edit, execute, and debug code together. Designed to replicate the Google Docs experience for software development, it provides a zero-setup environment for pair programming and team collaboration.

## Core Features

- Real-Time Code Synchronization: Powered by an Operational Transformation (OT) engine to guarantee conflict-free, concurrent editing with live cursors.
- Isolated Browser Terminal: Full Linux terminal emulation via `node-pty` and `xterm.js`, backed by disposable, isolated Docker containers for each room.
- Seamless Video and Audio Calls: Built-in WebRTC peer-to-peer communication to facilitate live pair programming without external tools.
- Multi-Language Code Execution: Run and test code in over 13 languages within isolated environments.
- Native GitHub Integration: Import full repository trees directly from GitHub and push commits directly from the browser IDE.
- AI Autocomplete and Chat Assistant: Integrated Gemini API provides real-time ghost-text autocomplete and contextual chat assistance.
- Collaborative Whiteboard: A synchronized Fabric.js canvas for drawing system architectures and flowcharts.
- Persistent Activity Dashboard: Tracks total time coded, committed snapshots, and recent collaborative rooms.

## Technology Stack

- Frontend: React 18, Vite, TailwindCSS
- Editor & Terminal: Monaco Editor, xterm.js
- Backend: Node.js, Express
- Real-Time Communication: Socket.IO, WebRTC (simple-peer)
- Containerization: Docker, node-pty
- Database: MongoDB, Mongoose
- Authentication: JSON Web Tokens (JWT), GitHub OAuth
- AI Integration: Google Gemini API

## Local Development Setup

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or Atlas cluster)
- Docker (must be running to use terminal and code execution features)

### 1. Clone and Install Dependencies

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `server` directory and provide the following variables:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# AI Integration
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Start the Development Servers

```bash
# Start backend server (from the server directory)
npm run dev

# Start frontend application (from the client directory)
npm run dev
```

The application will be available at:
- Client: http://localhost:5173
- Server: http://localhost:5000

## Deployment Architecture

CodeHive utilizes a hybrid deployment model:
- Frontend: Deployed globally via Vercel as a static Single Page Application (SPA).
- Backend: Deployed on AWS EC2 to maintain persistent WebSocket connections, orchestrate Docker containers for terminal sessions, and handle native Node-PTY bindings.

## License

MIT License
