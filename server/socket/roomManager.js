/**
 * Room Manager — In-memory tracking of active rooms and connected users.
 *
 * This runs alongside MongoDB. MongoDB stores persistent state (room config,
 * code snapshots). RoomManager tracks ephemeral state (who's connected right
 * now, current code buffer, operation history).
 */
class RoomManager {
  constructor() {
    /**
     * Active rooms map.
     * Key: roomId (string)
     * Value: {
     *   code: string,
     *   language: string,
     *   version: number,
     *   users: Map<socketId, { userId, userName, color, cursorPosition }>,
     *   operationHistory: Array<{ operation, version, userId }>
     * }
     */
    this.rooms = new Map();
  }

  /**
   * Create or retrieve an active room.
   */
  getOrCreateRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        files: new Map(), // fileId -> { content, language, version, operationHistory }
        users: new Map(), // socketId -> { userId, userName, color, cursorPosition, activeFileId }
        whiteboard: [],   // Array of serialized Fabric.js objects
      });
    }
    return this.rooms.get(roomId);
  }

  /**
   * Initialize room files from MongoDB.
   */
  initRoomFiles(roomId, mongoFiles) {
    const room = this.getOrCreateRoom(roomId);
    if (room.files.size === 0 && mongoFiles) {
      Object.entries(mongoFiles).forEach(([fileId, fileData]) => {
        room.files.set(fileId, {
          name: fileData.name,
          type: fileData.type || 'file',
          parentId: fileData.parentId || null,
          content: (fileData.content || '').replace(/\r\n/g, '\n'),
          language: fileData.language || 'javascript',
          version: 0,
          operationHistory: []
        });
      });
    }
  }

  /**
   * Add a user to a room.
   */
  addUser(roomId, socketId, { userId, userName, color }) {
    const room = this.getOrCreateRoom(roomId);
    let removed = null;

    for (const [existingSocketId, existingUser] of room.users.entries()) {
      if (existingUser.userId?.toString() === userId?.toString()) {
        removed = { socketId: existingSocketId, user: existingUser };
        room.users.delete(existingSocketId);
        break;
      }
    }

    room.users.set(socketId, {
      userId,
      userName,
      color,
      cursorPosition: { lineNumber: 1, column: 1 },
      activeFileId: null, // tracked when they switch files
      joinedAt: new Date(),
    });
    return { room, removed };
  }

  /**
   * Remove a user from a room by socket ID.
   * Returns the removed user info, or null.
   */
  removeUser(socketId) {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.users.has(socketId)) {
        const user = room.users.get(socketId);
        room.users.delete(socketId);

        // Clean up empty rooms from memory
        if (room.users.size === 0) {
          this.rooms.delete(roomId);
        }

        return { roomId, user };
      }
    }
    return null;
  }

  /**
   * Get all users in a room (as an array).
   */
  getRoomUsers(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    return Array.from(room.users.entries()).map(([socketId, user]) => ({
      socketId,
      ...user,
    }));
  }

  /**
   * Get current room state.
   */
  getRoomState(roomId) {
    return this.rooms.get(roomId) || null;
  }

  /**
   * Update a user's active file
   */
  updateActiveFile(roomId, socketId, fileId) {
    const room = this.rooms.get(roomId);
    if (room && room.users.has(socketId)) {
      room.users.get(socketId).activeFileId = fileId;
    }
  }

  /**
   * Update the code for a specific file.
   */
  updateCode(roomId, fileId, code) {
    const room = this.rooms.get(roomId);
    if (room && room.files.has(fileId)) {
      room.files.get(fileId).content = (code || '').replace(/\r\n/g, '\n');
    }
  }

  /**
   * Update a user's cursor position.
   */
  updateCursor(roomId, socketId, position) {
    const room = this.rooms.get(roomId);
    if (room && room.users.has(socketId)) {
      room.users.get(socketId).cursorPosition = position;
    }
  }

  /**
   * Add a file to tracking
   */
  addFile(roomId, fileId, fileData) {
    const room = this.rooms.get(roomId);
    if (room && !room.files.has(fileId)) {
      room.files.set(fileId, {
        name: fileData.name,
        type: fileData.type || 'file',
        parentId: fileData.parentId || null,
        content: (fileData.content || '').replace(/\r\n/g, '\n'),
        language: fileData.language || 'javascript',
        version: 0,
        operationHistory: []
      });
    }
  }

  /**
   * Move a file to a new parent folder
   */
  moveFile(roomId, fileId, parentId) {
    const room = this.rooms.get(roomId);
    if (room && room.files.has(fileId)) {
      const file = room.files.get(fileId);
      file.parentId = parentId;
    }
  }

  /**
   * Remove a file from tracking
   */
  removeFile(roomId, fileId) {
    const room = this.rooms.get(roomId);
    if (room) {
      const deleteRecursive = (id) => {
        room.files.delete(id);
        for (let [k, v] of room.files.entries()) {
          if (v.parentId === id) deleteRecursive(k);
        }
      };
      deleteRecursive(fileId);
    }
  }

  /**
   * Rename a file
   */
  renameFile(roomId, fileId, newName, newLanguage) {
    const room = this.rooms.get(roomId);
    if (room && room.files.has(fileId)) {
      const file = room.files.get(fileId);
      file.name = newName;
      if (newLanguage) file.language = newLanguage;
    }
  }

  /**
   * Add an operation to the file's history and increment version.
   */
  addOperation(roomId, fileId, operation, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const file = room.files.get(fileId);
    if (!file) return null;

    file.version += 1;
    file.operationHistory.push({
      operation,
      version: file.version,
      userId,
      timestamp: Date.now(),
    });

    // Keep history bounded (last 1000 operations)
    if (file.operationHistory.length > 1000) {
      file.operationHistory = file.operationHistory.slice(-500);
    }

    return file.version;
  }

  /**
   * Find which room a socket is in.
   */
  findRoomBySocket(socketId) {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.users.has(socketId)) {
        return roomId;
      }
    }
    return null;
  }

  /**
   * Get stats about active rooms.
   */
  getStats() {
    return {
      activeRooms: this.rooms.size,
      totalUsers: Array.from(this.rooms.values()).reduce(
        (sum, room) => sum + room.users.size,
        0
      ),
    };
  }

  // ─── WHITEBOARD ─────────────────────────────────────────────

  /**
   * Update whiteboard objects for a room.
   * Replaces the entire whiteboard state (full canvas JSON).
   */
  updateWhiteboard(roomId, objects) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.whiteboard = objects;
    }
  }

  /**
   * Get the current whiteboard state for a room.
   */
  getWhiteboard(roomId) {
    const room = this.rooms.get(roomId);
    return room ? (room.whiteboard || []) : [];
  }

  /**
   * Clear the whiteboard for a room.
   */
  clearWhiteboard(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.whiteboard = [];
    }
  }
}

export default new RoomManager();
