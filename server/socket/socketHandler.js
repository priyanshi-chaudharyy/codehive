import Room from '../models/Room.js';
import Message from '../models/Message.js';
import roomManager from './roomManager.js';
import otEngine from './otEngine.js';
import { executeCode } from '../utils/codeExecutor.js';

/**
 * Assign a unique cursor color to a user in a room.
 */
const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F0B27A', '#82E0AA',
  '#F1948A', '#73C6B6', '#AED6F1', '#FAD7A0',
];

let colorIndex = 0;
const getNextColor = () => {
  const color = CURSOR_COLORS[colorIndex % CURSOR_COLORS.length];
  colorIndex++;
  return color;
};

/**
 * Initialize all Socket.io event handlers.
 *
 * @param {import('socket.io').Server} io - The Socket.io server instance
 */
export const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ─── ROOM EVENTS ───────────────────────────────────────────

    /**
     * User joins a room.
     * Loads room state from MongoDB if first user, or from memory if room is active.
     */
    socket.on('join-room', async ({ roomId, userId, userName }) => {
      try {
        socket.join(roomId);
        const color = getNextColor();

        // Try to load room from DB if not in memory
        let roomState = roomManager.getRoomState(roomId);
        if (!roomState) {
          const dbRoom = await Room.findOne({ roomId });
          if (dbRoom) {
            roomManager.getOrCreateRoom(roomId, dbRoom.code, dbRoom.language);
          } else {
            roomManager.getOrCreateRoom(roomId);
          }
        }

        // Add user to room (enforce one socket per user)
        const { room, removed } = roomManager.addUser(roomId, socket.id, {
          userId,
          userName,
          color,
        });

        if (removed && removed.socketId !== socket.id) {
          const oldSocket = io.sockets.sockets.get(removed.socketId);
          if (oldSocket) {
            oldSocket.leave(roomId);
            oldSocket.disconnect(true);
          }
          socket.to(roomId).emit('user-left', {
            userId: removed.user.userId,
            userName: removed.user.userName,
            socketId: removed.socketId,
            users: roomManager.getRoomUsers(roomId),
          });
        }

        const userRecord = { userId, userName, color };

        // 1. Initialize or get room state from DB
        const dbRoom = await Room.findOne({ roomId });
        if (dbRoom && dbRoom.files) {
          roomManager.initRoomFiles(roomId, Object.fromEntries(dbRoom.files));
        }

        const { room: updatedRoomState } = roomManager.addUser(roomId, socket.id, {
          userId,
          userName,
          color: userRecord?.color,
        });

        // 2. Add socket to Socket.IO room
        socket.join(roomId);

        // 3. Send current state to the joining user
        socket.emit('room-state', {
          roomId,
          files: updatedRoomState.files ? Object.fromEntries(updatedRoomState.files) : {},
          users: roomManager.getRoomUsers(roomId),
          snapshots: dbRoom?.snapshots || [],
        });

        // Load recent messages
        const messages = await Message.find({ roomId })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();
        socket.emit('message-history', messages.reverse());

        // Notify others in the room
        socket.to(roomId).emit('user-joined', {
          userId,
          userName,
          color,
          socketId: socket.id,
          users: roomManager.getRoomUsers(roomId),
        });

        // System message
        const sysMessage = await Message.create({
          roomId,
          userId,
          userName,
          text: `${userName} joined the room`,
          type: 'system',
        });
        io.to(roomId).emit('new-message', sysMessage);

        console.log(`👤 ${userName} joined room ${roomId}`);
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    socket.on('save-snapshot', async ({ roomId, fileId, code, language, userId }) => {
      try {
        const room = await Room.findOne({ roomId });
        if (room) {
          // If we want to save snapshots globally, we can just save it.
          // Or save per-file snapshots. Let's just keep the global snapshots array,
          // but include the fileId in the snapshot name or logic if we want.
          // We'll just save it as is.
          room.snapshots.push({
            code,
            language,
            savedBy: userId,
          });
          await room.save();
          
          socket.emit('snapshot-saved', { success: true });
          socket.to(roomId).emit('new-snapshot', room.snapshots[room.snapshots.length - 1]);
        }
      } catch (error) {
        console.error('Error saving snapshot:', error);
        socket.emit('snapshot-error', { message: 'Failed to save snapshot' });
      }
    });

    /**
     * User explicitly leaves a room.
     */
    socket.on('leave-room', ({ roomId, userId }) => {
      socket.leave(roomId);
      handleUserLeave(socket, io, roomId);
    });

    // ─── EDITOR EVENTS ─────────────────────────────────────────

    /**
     * Code change from a client.
     * Transform against concurrent operations and broadcast.
     */
    socket.on('code-change', ({ roomId, fileId, operation, version }) => {
      try {
        const room = roomManager.getRoomState(roomId);
        if (!room) return;

        const file = room.files.get(fileId);
        if (!file) return;

        const versionDrift = file.version - version;

        // If client is too far behind, skip OT and send full sync
        if (versionDrift > 5) {
          socket.emit('code-full-sync', {
            fileId,
            code: file.content,
            version: file.version,
          });
          return;
        }

        // Get operations that happened since the client's version
        const concurrentOps = file.operationHistory
          .filter((entry) => entry.version > version)
          .map((entry) => entry.operation);

        // Transform the incoming operation against concurrent ones
        const transformedOp = concurrentOps.length > 0
          ? otEngine.transformAgainstAll(operation, concurrentOps)
          : operation;

        if (transformedOp.type === 'noop') {
          // Operation was cancelled by concurrent edits — just ack
          socket.emit('code-ack', { fileId, version: file.version });
          return;
        }

        // Apply to server's code state
        file.content = otEngine.apply(file.content, transformedOp);

        // Record the operation
        const user = room.users.get(socket.id);
        const newVersion = roomManager.addOperation(
          roomId,
          fileId,
          transformedOp,
          user?.userId
        );

        // Broadcast to other clients in the room
        socket.to(roomId).emit('code-update', {
          fileId,
          operation: transformedOp,
          version: newVersion,
          userId: user?.userId,
          serverCode: file.content,
        });

        // ACK to sender with the server's version, code, and the transformed op
        socket.emit('code-ack', {
          fileId,
          version: newVersion,
          transformedOp,
          serverCode: file.content,
        });
      } catch (error) {
        console.error('Error handling code change:', error);
      }
    });

    /**
     * Full code sync — used when OT state might be out of sync.
     */
    socket.on('code-sync', ({ roomId, fileId, code }) => {
      roomManager.updateCode(roomId, fileId, code);
      socket.to(roomId).emit('code-full-sync', { fileId, code });
    });

    /**
     * Cursor position update.
     */
    socket.on('cursor-move', ({ roomId, fileId, userId, position }) => {
      roomManager.updateCursor(roomId, socket.id, position);
      const user = roomManager.getRoomState(roomId)?.users.get(socket.id);

      socket.to(roomId).emit('cursor-update', {
        userId,
        socketId: socket.id,
        fileId,
        position,
        color: user?.color,
        userName: user?.userName,
      });
    });

    /**
     * File System Events
     */
    socket.on('active-file-change', ({ roomId, fileId }) => {
      roomManager.updateActiveFile(roomId, socket.id, fileId);
    });

    socket.on('file-created', async ({ roomId, fileId, fileData }) => {
      roomManager.addFile(roomId, fileId, fileData);
      socket.to(roomId).emit('file-created', { fileId, fileData });
      
      try {
        const room = await Room.findOne({ roomId });
        if (room) {
          room.files.set(fileId, fileData);
          await room.save();
        }
      } catch (err) {
        console.error('Error saving file-created to DB:', err);
      }
    });

    socket.on('file-deleted', async ({ roomId, fileId }) => {
      roomManager.removeFile(roomId, fileId);
      socket.to(roomId).emit('file-deleted', { fileId });
      
      try {
        const room = await Room.findOne({ roomId });
        if (room) {
          // Delete recursive
          const deleteRecursive = (id) => {
            room.files.delete(id);
            for (let [k, v] of room.files.entries()) {
              if (v.parentId === id) deleteRecursive(k);
            }
          };
          deleteRecursive(fileId);
          await room.save();
        }
      } catch (err) {
        console.error('Error saving file-deleted to DB:', err);
      }
    });

    socket.on('file-renamed', async ({ roomId, fileId, newName, newLanguage }) => {
      roomManager.renameFile(roomId, fileId, newName, newLanguage);
      socket.to(roomId).emit('file-renamed', { fileId, newName, newLanguage });
      
      try {
        const room = await Room.findOne({ roomId });
        if (room && room.files.has(fileId)) {
          const file = room.files.get(fileId);
          file.name = newName;
          if (newLanguage) file.language = newLanguage;
          room.files.set(fileId, file);
          await room.save();
        }
      } catch (err) {
        console.error('Error saving file-renamed to DB:', err);
      }
    });

    /**
     * Language change.
     */
    socket.on('language-change', async ({ roomId, language }) => {
      roomManager.updateLanguage(roomId, language);

      // Persist to DB
      await Room.findOneAndUpdate({ roomId }, { language });

      socket.to(roomId).emit('language-updated', { language });
    });

    // ─── VIDEO/WEBRTC SIGNALING EVENTS ──────────────────────────

    socket.on('join-call', ({ roomId, userId, userName }) => {
      socket.to(roomId).emit('user-joined-call', { userId, userName, socketId: socket.id });
    });

    socket.on('leave-call', ({ roomId, userId }) => {
      socket.to(roomId).emit('user-left-call', { userId, socketId: socket.id });
    });

    socket.on('webrtc-signal', ({ signal, to }) => {
      socket.to(to).emit('webrtc-signal', { signal, from: socket.id });
    });

    socket.on('video-offer', ({ roomId, offer, to }) => {
      socket.to(to).emit('video-offer', { offer, from: socket.id });
    });

    socket.on('video-answer', ({ roomId, answer, to }) => {
      socket.to(to).emit('video-answer', { answer, from: socket.id });
    });

    socket.on('ice-candidate', ({ roomId, candidate, to }) => {
      socket.to(to).emit('ice-candidate', { candidate, from: socket.id });
    });

    socket.on('toggle-video', ({ roomId, userId, isOn }) => {
      socket.to(roomId).emit('user-toggled-video', { userId, socketId: socket.id, isOn });
    });

    socket.on('toggle-audio', ({ roomId, userId, isOn }) => {
      socket.to(roomId).emit('user-toggled-audio', { userId, socketId: socket.id, isOn });
    });

    // ─── CHAT EVENTS ────────────────────────────────────────────

    socket.on('send-message', async ({ roomId, text, userId, userName, type = 'text' }) => {
      try {
        const message = await Message.create({
          roomId,
          userId,
          userName,
          text,
          type,
        });

        io.to(roomId).emit('new-message', message);
      } catch (error) {
        console.error('Error sending message:', error);
      }
    });

    socket.on('user-typing', ({ roomId, userId, userName }) => {
      socket.to(roomId).emit('user-typing', { userId, userName, socketId: socket.id });
    });

    socket.on('user-stop-typing', ({ roomId, userId }) => {
      socket.to(roomId).emit('user-stop-typing', { userId, socketId: socket.id });
    });

    socket.on('user-status-change', ({ roomId, userId, status }) => {
      socket.to(roomId).emit('user-status-change', { userId, socketId: socket.id, status });
    });

    // ─── CODE EXECUTION EVENTS ──────────────────────────────────

    socket.on('run-code', async ({ roomId, code, language }) => {
      try {
        io.to(roomId).emit('execution-start');

        const result = await executeCode(code, language);

        io.to(roomId).emit('execution-result', result);
      } catch (error) {
        io.to(roomId).emit('execution-error', {
          message: error.message || 'Code execution failed',
        });
      }
    });

    // ─── DISCONNECT ─────────────────────────────────────────────

    socket.on('disconnect', () => {
      const roomId = roomManager.findRoomBySocket(socket.id);
      if (roomId) {
        handleUserLeave(socket, io, roomId);
      }
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
};

/**
 * Handle a user leaving a room — clean up and notify others.
 */
async function handleUserLeave(socket, io, roomId) {
  const result = roomManager.removeUser(socket.id);
  if (!result) return;

  const { user } = result;

  // Persist current code to DB before room might be cleaned up
  const roomState = roomManager.getRoomState(roomId);
  if (roomState) {
    await Room.findOneAndUpdate({ roomId }, { code: roomState.code });
  }

  // Notify others
  socket.to(roomId).emit('user-left', {
    userId: user.userId,
    userName: user.userName,
    socketId: socket.id,
    users: roomManager.getRoomUsers(roomId),
  });

  // System message
  try {
    const sysMessage = await Message.create({
      roomId,
      userId: user.userId,
      userName: user.userName,
      text: `${user.userName} left the room`,
      type: 'system',
    });
    io.to(roomId).emit('new-message', sysMessage);
  } catch (error) {
    console.error('Error creating leave message:', error);
  }

  console.log(`👤 ${user.userName} left room ${roomId}`);
}
