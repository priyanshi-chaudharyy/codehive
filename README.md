# CodeHive 🐝

## Real-Time Collaborative IDE Platform

CodeHive is a real-time collaborative coding platform where multiple developers can write, edit, and execute code simultaneously in the browser — like Google Docs but for code.

###  Features

-  **Real-time Code Sync** — Operational Transformation keeps everyone in sync instantly
-  **AI Autocomplete & Chat** — Integrated AI assistant for code suggestions and answering technical questions right in the editor
-  **Video/Audio Calls** — Built-in WebRTC peer-to-peer communication for pair programming
-  **Live Chat** — In-room messaging to coordinate with your team
-  **Integrated Terminal** — Run real command-line execution and shell scripts in the browser via `node-pty`
-  **GitHub Integration** — Import repositories directly from GitHub to collaborate on existing projects
-  **Activity Dashboard** — Comprehensive dashboard tracking recent room activities, time coded, and commit snapshots
-  **Code Execution** — Compile and run code in 10+ languages (JavaScript, Python, Go, Rust, C++, etc.)
-  **Multi-Cursor Awareness** — See exactly where everyone is typing and clicking
-  **Authentication** — Secure JWT-based signup/login and GitHub OAuth integration

###  Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, TailwindCSS, Monaco Editor |
| **Backend** | Node.js, Express, Socket.io |
| **Database** | MongoDB + Mongoose |
| **Video Calls**| WebRTC + Simple-Peer |
| **Terminal** | `node-pty` + xterm.js |
| **AI Magic** | Gemini/OpenAI API |

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
