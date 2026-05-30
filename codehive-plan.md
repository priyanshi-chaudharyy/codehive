# CodeHive 🐝
## Real-Time Collaborative IDE Platform

---

## 📝 Project Script (What to Say in Interviews)

### **Elevator Pitch (30 seconds):**
> "CodeHive is a real-time collaborative coding platform where multiple developers can write, edit, and execute code simultaneously in the browser — like Google Docs but for code. It features live cursor tracking, video/audio calls, chat, and supports 10+ programming languages with instant code execution."

### **Technical Description (2 minutes):**
> "CodeHive solves the problem of remote pair programming. Traditional tools like Zoom + sharing screen are laggy and one-directional — only one person can type. CodeHive uses Operational Transformation to allow multiple users to edit the same file concurrently without conflicts, similar to how Google Docs handles simultaneous editing.

> On the frontend I used Monaco Editor — the same editor that powers VS Code — integrated with React and Socket.io for real-time synchronization. Every keystroke is captured as an 'operation' (insert/delete at position), sent to the server, transformed against concurrent operations, and broadcast to all users in under 100ms.

> For video/audio I implemented WebRTC peer-to-peer connections using the Simple-Peer library, with Socket.io acting as the signaling server to exchange SDP offers and ICE candidates.

> Code execution is handled by integrating with the Judge0 API, which runs code in isolated Docker containers on their servers, returning stdout, stderr, and execution time — completely secure.

> The backend is Node.js/Express with MongoDB for persisting rooms, user data, and code snapshots. Socket.io manages real-time events with rooms scoped by session ID."

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                           │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │Monaco Editor│  │  Video Panel │  │     Chat Panel       │   │
│  │  (VS Code)  │  │  (WebRTC)    │  │   (Socket.io)        │   │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬───────────┘   │
│         │                │                      │               │
│  ┌──────▼──────────────────────────────────────▼───────────┐   │
│  │              Socket.io Client                            │   │
│  └──────────────────────────┬───────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              │ WebSocket
┌─────────────────────────────▼───────────────────────────────────┐
│                     SERVER (Node.js)                            │
│                                                                 │
│  ┌───────────────┐  ┌────────────────┐  ┌──────────────────┐   │
│  │  REST API     │  │  Socket.io     │  │  WebRTC Signal   │   │
│  │  (Express)    │  │  Server        │  │  Server          │   │
│  └───────┬───────┘  └───────┬────────┘  └────────┬─────────┘   │
│          │                  │                     │             │
│  ┌───────▼──────────────────▼─────────────────────▼─────────┐  │
│  │                    Core Services                          │  │
│  │  ┌──────────────┐  ┌─────────────┐  ┌─────────────────┐  │  │
│  │  │  OT Engine   │  │  Room Mgr   │  │  Code Executor  │  │  │
│  │  │  (Transform) │  │  (Sessions) │  │  (Judge0 API)   │  │  │
│  │  └──────────────┘  └─────────────┘  └─────────────────┘  │  │
│  └───────────────────────────┬───────────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                      DATABASE (MongoDB)                         │
│                                                                 │
│   Users        Rooms         Messages       Snapshots           │
│   ─────        ─────         ────────       ─────────           │
│   _id          _id           _id            _id                 │
│   name         code          roomId         roomId              │
│   email        language      userId         code                │
│   password     users[]       text           language            │
│   avatar       messages[]    timestamp      createdAt           │
│   rooms[]      snapshots[]                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Application Flow

### **Flow 1: User Creates a Room**
```
User Opens App
      │
      ▼
Login/Signup (JWT Auth)
      │
      ▼
Dashboard → "New Room"
      │
      ▼
Server creates Room in MongoDB
(roomId, language, empty code)
      │
      ▼
User gets unique Room URL
(codebridge.app/room/abc123)
      │
      ▼
Socket.io: user joins room "abc123"
      │
      ▼
Share URL with teammates
```

---

### **Flow 2: Real-Time Code Sync (Most Important)**
```
User A Types "Hello"          User B Types "World"
       │                              │
       ▼                              ▼
Operation Created:            Operation Created:
{type:"insert",               {type:"insert",
 pos:0,                        pos:0,
 text:"Hello"}                 text:"World"}
       │                              │
       ▼                              ▼
Sent to Server via            Sent to Server via
Socket.io                     Socket.io
       │                              │
       └──────────┐  ┌────────────────┘
                  ▼  ▼
           OT Engine Transforms:
           "Which came first?"
           "How do positions change?"
                  │
                  ▼
           Broadcasts resolved
           operations to BOTH users
                  │
           ┌──────┴──────┐
           ▼             ▼
    User A sees:   User B sees:
    "HelloWorld"   "HelloWorld"
    (consistent)   (consistent)
```

---

### **Flow 3: WebRTC Video Call**
```
User A clicks "Start Video"
       │
       ▼
Browser asks camera permission
       │
       ▼
User A sends "offer" to Server
(Socket.io signaling)
       │
       ▼
Server forwards offer to User B
       │
       ▼
User B receives offer, sends "answer"
       │
       ▼
Server forwards answer to User A
       │
       ▼
ICE Candidates exchanged
(finding best network path)
       │
       ▼
P2P Connection Established!
(Video/Audio flows directly
 between browsers - NO server!)
```

---

### **Flow 4: Code Execution**
```
User clicks "Run Code"
       │
       ▼
Frontend sends {code, language}
to backend REST API
       │
       ▼
Server sends to Judge0 API:
{source_code, language_id}
       │
       ▼
Judge0 runs code in
isolated Docker container
       │
       ▼
Returns {stdout, stderr,
         time, memory}
       │
       ▼
Server broadcasts result
to ALL users in room
via Socket.io
       │
       ▼
Output panel shows result
```

---

## 🗂️ Complete Project Structure

```
codehive/
│
├── server/                          # Backend
│   ├── server.js                    # Entry point
│   ├── package.json
│   ├── .env
│   │
│   ├── models/
│   │   ├── User.js                  # User schema
│   │   ├── Room.js                  # Room schema
│   │   └── Message.js               # Chat message schema
│   │
│   ├── controllers/
│   │   ├── authController.js        # signup, login, logout
│   │   ├── roomController.js        # create, join, delete rooms
│   │   └── codeController.js        # execute code, save snapshot
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── roomRoutes.js
│   │   └── codeRoutes.js
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js        # JWT protect
│   │   └── errorMiddleware.js       # Global error handler
│   │
│   ├── socket/
│   │   ├── socketHandler.js         # Main socket event handler
│   │   ├── otEngine.js              # Operational Transformation logic
│   │   └── roomManager.js           # Track active rooms & users
│   │
│   └── utils/
│       ├── generateToken.js
│       └── codeExecutor.js          # Judge0 API integration
│
├── client/                          # Frontend
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   │
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       │
│       ├── context/
│       │   ├── AuthContext.jsx      # Global auth state
│       │   └── SocketContext.jsx    # Socket.io instance
│       │
│       ├── pages/
│       │   ├── LandingPage.jsx      # Homepage
│       │   ├── LoginPage.jsx
│       │   ├── SignupPage.jsx
│       │   ├── DashboardPage.jsx    # User's rooms
│       │   └── EditorPage.jsx       # Main editor (most complex)
│       │
│       ├── components/
│       │   ├── editor/
│       │   │   ├── CodeEditor.jsx   # Monaco wrapper
│       │   │   ├── EditorToolbar.jsx
│       │   │   └── OutputPanel.jsx
│       │   │
│       │   ├── video/
│       │   │   ├── VideoPanel.jsx   # WebRTC video grid
│       │   │   └── VideoTile.jsx    # Single user video
│       │   │
│       │   ├── chat/
│       │   │   ├── ChatPanel.jsx
│       │   │   └── ChatMessage.jsx
│       │   │
│       │   ├── users/
│       │   │   ├── UserPresence.jsx # Who's online
│       │   │   └── UserCursor.jsx   # Colored cursors
│       │   │
│       │   └── shared/
│       │       ├── Navbar.jsx
│       │       ├── Loader.jsx
│       │       └── Toast.jsx
│       │
│       ├── hooks/
│       │   ├── useSocket.js         # Socket.io hook
│       │   ├── useWebRTC.js         # WebRTC logic
│       │   └── useEditor.js         # Editor state
│       │
│       └── services/
│           ├── api.js               # Axios instance
│           ├── authService.js
│           ├── roomService.js
│           └── codeService.js
```

---

## 📊 Database Schemas

### **User Schema**
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  avatar: String (color or image),
  rooms: [{ type: ObjectId, ref: 'Room' }],
  createdAt: Date
}
```

### **Room Schema**
```javascript
{
  roomId: String (unique, short e.g. "abc-123"),
  name: String,
  language: String (default: 'javascript'),
  code: String (current code state),
  owner: { type: ObjectId, ref: 'User' },
  participants: [{
    userId: ObjectId,
    name: String,
    color: String,   // cursor color
    joinedAt: Date
  }],
  isPublic: Boolean,
  password: String,  // optional room password
  snapshots: [{
    code: String,
    savedAt: Date,
    savedBy: ObjectId
  }],
  createdAt: Date
}
```

### **Message Schema**
```javascript
{
  roomId: String,
  userId: { type: ObjectId, ref: 'User' },
  userName: String,
  text: String,
  type: String (enum: 'text', 'system', 'code'),
  timestamp: Date
}
```

---

## 🔌 Socket.io Events (Complete List)

### **Client → Server (Emit)**
```javascript
// Room events
'join-room'     { roomId, userId, userName }
'leave-room'    { roomId, userId }

// Editor events
'code-change'   { roomId, operation, version }
'cursor-move'   { roomId, userId, position }
'language-change' { roomId, language }

// Video events
'video-offer'   { roomId, offer, to }
'video-answer'  { roomId, answer, to }
'ice-candidate' { roomId, candidate, to }
'toggle-video'  { roomId, userId, isOn }
'toggle-audio'  { roomId, userId, isOn }

// Chat events
'send-message'  { roomId, text, userId }

// Code execution
'run-code'      { roomId, code, language }
```

### **Server → Client (Broadcast)**
```javascript
// Room events
'user-joined'     { userId, userName, color, users[] }
'user-left'       { userId, userName }

// Editor events
'code-update'     { operation, version }
'cursor-update'   { userId, position, color }
'language-updated' { language }

// Video events
'video-offer'     { offer, from }
'video-answer'    { answer, from }
'ice-candidate'   { candidate, from }
'user-toggled-video' { userId, isOn }

// Chat events
'new-message'     { text, userId, userName, timestamp }

// Code execution
'execution-result' { stdout, stderr, time, memory }
'execution-error'  { message }
```

---

## 🗓️ Week-by-Week Development Plan

---

### **WEEK 1: Foundation + Core Editor**

#### **Day 1-2: Project Setup**
```bash
# Create project
mkdir codebridge && cd codebridge

# Backend setup
mkdir server && cd server
npm init -y
npm install express mongoose socket.io cors helmet dotenv
npm install jsonwebtoken bcryptjs cookie-parser
npm install axios nodemon

# Frontend setup
cd ..
npm create vite@latest client -- --template react
cd client
npm install axios socket.io-client react-router-dom
npm install @monaco-editor/react
npm install lucide-react tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Tasks:**
- [ ] Setup Express server with CORS
- [ ] Connect MongoDB
- [ ] Create User model
- [ ] Create Room model
- [ ] Setup React with routing
- [ ] Configure Tailwind CSS
- [ ] Create basic dark theme layout

---

#### **Day 3-4: Authentication**
**Backend:**
- [ ] POST `/api/auth/signup`
- [ ] POST `/api/auth/login`
- [ ] GET `/api/auth/me`
- [ ] JWT middleware

**Frontend:**
- [ ] Login page
- [ ] Signup page
- [ ] AuthContext
- [ ] Protected routes

---

#### **Day 5-6: Room Management**
**Backend:**
- [ ] POST `/api/rooms` (create room)
- [ ] GET `/api/rooms` (user's rooms)
- [ ] GET `/api/rooms/:roomId` (room details)
- [ ] DELETE `/api/rooms/:roomId`

**Frontend:**
- [ ] Dashboard page (list rooms)
- [ ] Create room modal
- [ ] Join room by ID
- [ ] Room card component

---

#### **Day 7: Monaco Editor Integration**
```javascript
// Basic Monaco setup
import Editor from '@monaco-editor/react';

const CodeEditor = ({ code, language, onChange }) => {
  return (
    <Editor
      height="100%"
      language={language}
      value={code}
      theme="vs-dark"
      onChange={onChange}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on',
        automaticLayout: true
      }}
    />
  );
};
```

**Tasks:**
- [ ] Monaco Editor working
- [ ] Language selector (JS, Python, Java, C++)
- [ ] Editor toolbar (run, save, copy)
- [ ] Output panel at bottom

---

### **WEEK 2: Real-Time Collaboration**

#### **Day 1-2: Socket.io Setup**
**Backend (`server/socket/socketHandler.js`):**
```javascript
// Room tracking (in memory for active rooms)
const rooms = new Map();
// rooms.get(roomId) = { users: [], code: "" }

io.on('connection', (socket) => {
  socket.on('join-room', ({ roomId, userId, userName }) => {
    socket.join(roomId);
    
    // Add user to room
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { users: [], code: '' });
    }
    rooms.get(roomId).users.push({ socketId: socket.id, userId, userName });
    
    // Send current state to new user
    socket.emit('room-state', {
      code: rooms.get(roomId).code,
      users: rooms.get(roomId).users
    });
    
    // Tell others new user joined
    socket.to(roomId).emit('user-joined', { userId, userName });
  });
  
  socket.on('disconnect', () => {
    // Clean up rooms
  });
});
```

**Tasks:**
- [ ] Socket.io server setup
- [ ] Join/leave room events
- [ ] Broadcast users list
- [ ] Handle disconnection

---

#### **Day 3-4: Operational Transformation**
This is the most complex part! Here's a simplified version:

```javascript
// server/socket/otEngine.js

// Simple OT for text operations
class OTEngine {
  // Transform operation A against operation B
  // (when they happen at the same time)
  transform(opA, opB) {
    // Both are inserts
    if (opA.type === 'insert' && opB.type === 'insert') {
      if (opA.position <= opB.position) {
        // A comes before B - B shifts right
        return { ...opB, position: opB.position + opA.text.length };
      } else {
        // B comes before A - no change needed
        return opB;
      }
    }
    
    // Both are deletes
    if (opA.type === 'delete' && opB.type === 'delete') {
      if (opA.position < opB.position) {
        return { ...opB, position: opB.position - opA.length };
      }
      return opB;
    }
    
    return opB;
  }

  apply(code, operation) {
    if (operation.type === 'insert') {
      return (
        code.slice(0, operation.position) +
        operation.text +
        code.slice(operation.position)
      );
    }
    if (operation.type === 'delete') {
      return (
        code.slice(0, operation.position) +
        code.slice(operation.position + operation.length)
      );
    }
    return code;
  }
}

export default new OTEngine();
```

**Tasks:**
- [ ] OT Engine (insert/delete transform)
- [ ] Version vector tracking
- [ ] Conflict resolution
- [ ] Test with 2+ users typing simultaneously

---

#### **Day 5: Cursor Tracking**
```javascript
// Monaco cursor decoration
const updateRemoteCursor = (userId, position, color) => {
  const decorations = editorRef.current.deltaDecorations([], [
    {
      range: new monaco.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column
      ),
      options: {
        className: `cursor-${userId}`,
        beforeContentClassName: `cursor-label-${userId}`,
      }
    }
  ]);
};
```

**Tasks:**
- [ ] Track cursor position
- [ ] Send via Socket.io
- [ ] Render others' cursors in Monaco
- [ ] Color-code per user
- [ ] Show username label

---

#### **Day 6-7: Code Execution**
```javascript
// server/utils/codeExecutor.js
import axios from 'axios';

const JUDGE0_URL = 'https://judge0-ce.p.rapidapi.com';

const LANGUAGE_IDS = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
  c: 50,
  typescript: 74,
};

export const executeCode = async (code, language) => {
  // Step 1: Submit code
  const submitRes = await axios.post(
    `${JUDGE0_URL}/submissions`,
    {
      source_code: btoa(code), // base64 encode
      language_id: LANGUAGE_IDS[language],
    },
    {
      headers: {
        'X-RapidAPI-Key': process.env.JUDGE0_API_KEY,
        'Content-Type': 'application/json',
      },
      params: { base64_encoded: true, wait: true }
    }
  );

  const { token } = submitRes.data;

  // Step 2: Get result
  const resultRes = await axios.get(
    `${JUDGE0_URL}/submissions/${token}`,
    {
      headers: { 'X-RapidAPI-Key': process.env.JUDGE0_API_KEY },
      params: { base64_encoded: true }
    }
  );

  const result = resultRes.data;

  return {
    stdout: result.stdout ? atob(result.stdout) : '',
    stderr: result.stderr ? atob(result.stderr) : '',
    time: result.time,
    memory: result.memory,
    status: result.status.description
  };
};
```

**Tasks:**
- [ ] Judge0 API integration
- [ ] Language ID mapping
- [ ] Output panel with stdout/stderr
- [ ] Execution time display
- [ ] Broadcast result to all room users
- [ ] Loading state while executing

---

### **WEEK 3: Video, Chat & Polish**

#### **Day 1-2: WebRTC Video Calls**
```bash
npm install simple-peer
```

```javascript
// client/src/hooks/useWebRTC.js
import SimplePeer from 'simple-peer';

const useWebRTC = (socket, roomId, userId) => {
  const [peers, setPeers] = useState({});
  const myVideoRef = useRef();
  const streamRef = useRef();

  useEffect(() => {
    // Get camera/mic
    navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    }).then(stream => {
      streamRef.current = stream;
      myVideoRef.current.srcObject = stream;

      // When someone joins, create offer
      socket.on('user-joined', ({ userId: newUserId }) => {
        const peer = new SimplePeer({
          initiator: true,
          trickle: false,
          stream: stream
        });

        peer.on('signal', (offer) => {
          socket.emit('video-offer', { offer, to: newUserId });
        });

        peer.on('stream', (remoteStream) => {
          setPeers(prev => ({
            ...prev,
            [newUserId]: { peer, stream: remoteStream }
          }));
        });
      });

      // When we receive an offer, answer it
      socket.on('video-offer', ({ offer, from }) => {
        const peer = new SimplePeer({
          initiator: false,
          trickle: false,
          stream: stream
        });

        peer.signal(offer);

        peer.on('signal', (answer) => {
          socket.emit('video-answer', { answer, to: from });
        });

        peer.on('stream', (remoteStream) => {
          setPeers(prev => ({
            ...prev,
            [from]: { peer, stream: remoteStream }
          }));
        });
      });

      socket.on('video-answer', ({ answer, from }) => {
        peers[from]?.peer.signal(answer);
      });
    });
  }, [socket]);

  return { peers, myVideoRef };
};
```

**Tasks:**
- [ ] Get camera/mic permissions
- [ ] P2P connection with SimplePeer
- [ ] Video grid UI (2-4 users)
- [ ] Mute/unmute audio
- [ ] Hide/show video
- [ ] Leave call

---

#### **Day 3: Chat**
```javascript
// Simple chat via Socket.io
socket.on('send-message', ({ roomId, text, userId, userName }) => {
  const message = { text, userId, userName, timestamp: new Date() };
  
  // Save to MongoDB
  Message.create({ roomId, ...message });
  
  // Broadcast to room
  io.to(roomId).emit('new-message', message);
});
```

**Tasks:**
- [ ] Chat sidebar panel
- [ ] Message bubbles (mine vs others)
- [ ] Timestamps
- [ ] System messages ("User joined", "User left")
- [ ] Code snippet sharing in chat
- [ ] Unread message count badge

---

#### **Day 4: User Presence & UI Polish**
**Tasks:**
- [ ] Online users list with avatars
- [ ] User status indicators (typing, idle)
- [ ] Room settings modal (change language, name)
- [ ] Copy room link button
- [ ] Responsive layout (collapsible panels)
- [ ] Keyboard shortcuts (Ctrl+Enter to run)

---

#### **Day 5: Snapshots & History**
**Tasks:**
- [ ] Save code snapshot button
- [ ] List past snapshots
- [ ] Restore from snapshot
- [ ] Show diff between snapshots

---

#### **Day 6-7: Deployment & Documentation**
```bash
# Backend - Render.com
# Frontend - Vercel
# Database - MongoDB Atlas
```

**Tasks:**
- [ ] Environment variables setup
- [ ] Build frontend for production
- [ ] Deploy backend to Render
- [ ] Deploy frontend to Vercel
- [ ] Test live deployment
- [ ] Write README with screenshots
- [ ] Record demo video

---

## 🔑 Environment Variables

### **Server (.env)**
```env
# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database
MONGO_URI=mongodb://localhost:27017/codehive

# Auth
JWT_SECRET=your_secret_key

# Code Execution
JUDGE0_API_KEY=your_rapidapi_key
JUDGE0_URL=https://judge0-ce.p.rapidapi.com
```

### **Client (.env)**
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 📦 Complete Package List

### **Backend**
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.0.0",
    "socket.io": "^4.6.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "cookie-parser": "^1.4.6",
    "dotenv": "^16.0.3",
    "axios": "^1.4.0",
    "nodemon": "^3.0.0"
  }
}
```

### **Frontend**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.14.0",
    "axios": "^1.4.0",
    "socket.io-client": "^4.6.0",
    "@monaco-editor/react": "^4.5.2",
    "simple-peer": "^9.11.1",
    "lucide-react": "^0.263.1",
    "tailwindcss": "^3.3.0",
    "react-hot-toast": "^2.4.1"
  }
}
```

---

## 🎯 Feature Priority List (MoSCoW)

### **Must Have (Week 1-2):**
- [x] Authentication (signup/login)
- [x] Room creation and joining
- [x] Monaco code editor
- [x] Real-time code sync (Socket.io)
- [x] Code execution (Judge0)
- [x] Language switching

### **Should Have (Week 2-3):**
- [ ] Multi-cursor support
- [ ] Video/audio calls (WebRTC)
- [ ] Chat messaging
- [ ] User presence list

### **Could Have (Week 3):**
- [ ] Code snapshots/history
- [ ] Room password protection
- [ ] Keyboard shortcuts
- [ ] Syntax themes

### **Won't Have (Post-Placement):**
- [ ] AI code suggestions
- [ ] Git integration
- [ ] File system/multiple files
- [ ] Mobile support

---

## 💬 Interview Questions & Answers

**Q: How does real-time sync work?**
> "Every change in Monaco Editor triggers an 'operation' (insert or delete with position). This goes to the server via Socket.io, where Operational Transformation adjusts positions of concurrent operations before broadcasting to all users."

**Q: How did you prevent two people editing at same position?**
> "OT Engine transforms incoming operations against already-applied operations. If User A inserts at position 5 while User B deletes at position 3, the positions are recalculated so both operations apply correctly."

**Q: How does video calling work without a media server?**
> "WebRTC creates peer-to-peer connections directly between browsers. Socket.io acts as a signaling server only to exchange SDP offers/answers and ICE candidates. Once connected, video/audio flows directly without going through my server."

**Q: How do you handle a user disconnecting mid-session?**
> "Socket.io fires a disconnect event. I clean up the room's user list, broadcast 'user-left' to remaining users, close their WebRTC peer connections, and remove their cursor from others' editors."

**Q: Is the code execution secure?**
> "Code runs in Judge0's isolated Docker containers, not on my server. There's no access to my filesystem, network, or environment. I also enforce a 5-second timeout and 128MB memory limit."

---

## 📊 Technical Complexity Breakdown

| Feature | Complexity | Resume Impact |
|---------|-----------|--------------|
| Auth (JWT) | Low | Medium |
| Room Management | Low-Medium | Medium |
| Monaco Editor | Medium | High |
| Socket.io Sync | Medium-High | Very High |
| OT Engine | Very High | Very High |
| Cursor Tracking | High | High |
| WebRTC Video | High | Very High |
| Code Execution | Medium | High |
| Chat | Low-Medium | Medium |
| Snapshots | Medium | Medium |

---

## 🚀 How to Run

```bash
# Clone project
git clone https://github.com/yourusername/codehive

# Install backend
cd server
npm install
npm run dev

# Install frontend (new terminal)
cd client
npm install
npm run dev

# Open
# Frontend: http://localhost:5173
# Backend:  http://localhost:5000
```

---

## 📸 Key Screens to Build

1. **Landing Page:** Hero with "Start Coding" CTA, feature highlights
2. **Dashboard:** Grid of user's rooms, "New Room" button
3. **Editor Page:** 
   - Left: File tree (optional)
   - Center: Monaco editor (70% width)
   - Right: Chat + Users panel (30% width)
   - Bottom: Output panel
   - Top: Video tiles (collapsible)
   - Top: Toolbar (language, run, share, settings)

---

*Last Updated: May 2026 | Status: Planning Phase*