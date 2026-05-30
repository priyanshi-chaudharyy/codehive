# CodeHive 🐝

## Real-Time Collaborative IDE Platform

CodeHive is a real-time collaborative coding platform where multiple developers can write, edit, and execute code simultaneously in the browser — like Google Docs but for code.

### Features

- 🔄 **Real-time Code Sync** — Operational Transformation keeps everyone in sync
- 🎥 **Video/Audio Calls** — WebRTC peer-to-peer communication
- 💬 **Live Chat** — In-room messaging with Socket.io
- ▶️ **Code Execution** — Run code in 10+ languages via Judge0
- 👥 **Multi-Cursor** — See where everyone is typing
- 🔐 **Authentication** — JWT-based signup/login

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS, Monaco Editor |
| Backend | Node.js, Express, Socket.io |
| Database | MongoDB + Mongoose |
| Video | WebRTC + Simple-Peer |
| Code Exec | Judge0 API |

### Quick Start

```bash
# Install backend
cd server
npm install
npm run dev

# Install frontend (new terminal)
cd client
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

### Environment Variables

Copy `.env.example` to `.env` in the `server/` directory and fill in your values.

### License

MIT
