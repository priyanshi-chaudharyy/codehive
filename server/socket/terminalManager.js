import os from 'os';
import path from 'path';
import diskManager from '../utils/diskManager.js';
import { execSync } from 'child_process';

/**
 * Terminal Manager — manages one pseudo-terminal (PTY) per room.
 * 
 * Each room gets a shared terminal that all users can see and type into.
 * Uses node-pty to spawn a real shell process.
 * 
 * NOTE: node-pty requires native compilation. If it fails to install,
 * we fall back to a simple child_process-based approach.
 */

let pty = null;

try {
  pty = await import('node-pty');
} catch (err) {
  console.warn('⚠️  node-pty not available — terminal will use fallback mode');
}

class TerminalManager {
  constructor() {
    /**
     * Active rooms map.
     * Key: roomId (string)
     * Value: Map<terminalId, { process, dataCallback, history }>
     */
    this.rooms = new Map();
    this.MAX_HISTORY = 200; // lines to keep for late joiners
  }

  /**
   * Create a new terminal for a room.
   */
  async createTerminal(roomId, terminalId, roomFiles, onData, cols = 80, rows = 24) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }
    const roomTerminals = this.rooms.get(roomId);

    if (roomTerminals.has(terminalId)) {
      const existing = roomTerminals.get(terminalId);
      if (existing === 'pending') {
        // Wait for the pending creation to finish. A simple approach is to poll or just return false/ignore.
        // For simplicity, we can just return true here and hope the original caller sets it up correctly, 
        // but we'll lose the new onData. Let's just wait until it's no longer 'pending'.
        while (roomTerminals.get(terminalId) === 'pending') {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        // Once done, check if it was successfully created
        const terminal = roomTerminals.get(terminalId);
        if (terminal && terminal !== 'pending') {
          terminal.dataCallback = onData;
          return true;
        }
        if (!terminal) return false;
      } else {
        // Terminal already exists — just update the callback and send history
        existing.dataCallback = onData;
        return true;
      }
    }

    // Mark as pending to prevent concurrent creation of the same terminal
    roomTerminals.set(terminalId, 'pending');

    const roomContainerName = `codehive-term-${roomId}`;

    // Check if the master container for this room is already running
    let isContainerRunning = false;
    try {
      const output = execSync(`docker ps -q -f name=^/${roomContainerName}$`).toString().trim();
      if (output) isContainerRunning = true;
    } catch (e) {
      // Ignore
    }

    if (!isContainerRunning) {
      // Clean up any dead container first
      try {
        execSync(`docker rm -f ${roomContainerName}`, { stdio: 'ignore' });
      } catch (e) {}

      // Always map to the room's workspace directory
      let cwd = path.join(os.tmpdir(), 'codehive_rooms', roomId);
      if (roomFiles) {
        cwd = await diskManager.syncRoomToDisk(roomId, roomFiles);
      } else {
        const fs = (await import('fs/promises')).default;
        await fs.mkdir(cwd, { recursive: true }).catch(() => {});
      }
      const normalizedCwd = cwd.replace(/\\/g, '/');

      // Run as the same user as the host Node.js process so Docker
      // doesn't create root-owned files that block disk sync.
      const uid = process.getuid ? process.getuid() : 1000;
      const gid = process.getgid ? process.getgid() : 1000;

      const daemonArgs = [
        'run',
        '-d', // Run in background
        '-it',
        '--rm',
        '--user', `${uid}:${gid}`,
        // Map common dev server ports so they're accessible from the host.
        // NOTE: --network host does NOT work on Docker Desktop (Windows/Mac),
        // so we must use explicit -p mappings.
        // Avoid 5000 (CodeHive server) and 5173 (CodeHive client) to prevent conflicts.
        '-p', '3000-3005:3000-3005',
        '-p', '4000-4005:4000-4005',
        '-p', '5001-5010:5001-5010',
        '-p', '5174-5180:5174-5180',
        '-p', '8000-8005:8000-8005',
        '-p', '8080-8085:8080-8085',
        '--name', roomContainerName,
        '-v', `${normalizedCwd}:/workspace`,
        '-v', `codehive-nm-root-${roomId}:/workspace/node_modules`,
        '-v', `codehive-nm-server-${roomId}:/workspace/server/node_modules`,
        '-v', `codehive-nm-client-${roomId}:/workspace/client/node_modules`,
        '-w', '/workspace',
        '-e', 'HOME=/tmp',  // npm needs a writable HOME for cache
        'node:20-alpine',
        '/bin/sh'
      ];
      try {
        execSync(`docker ${daemonArgs.join(' ')}`, { stdio: 'ignore' });
      } catch (e) {
        console.error('Failed to start room daemon container:', e);
        roomTerminals.delete(terminalId);
        return false;
      }
    }

    // Now spawn the terminal session by exec-ing into the running container
    const shell = 'docker';
    const args = [
      'exec',
      '-it',
      roomContainerName,
      '/bin/sh'
    ];

    if (!pty) {
      // Fallback: no real PTY, create a mock terminal
      const terminal = {
        process: null,
        dataCallback: onData,
        history: [],
      };
      roomTerminals.set(terminalId, terminal);
      const welcome = '\r\n\x1b[33m⚠ Terminal is in demo mode (node-pty not available)\x1b[0m\r\n\x1b[90m$ \x1b[0m';
      terminal.history.push(welcome);
      onData(welcome);
      return true;
    }

    try {
      const ptyProcess = pty.default.spawn(shell, args, {
        name: 'xterm-256color',
        cols: cols || 80,
        rows: rows || 24,
        env: { ...process.env, TERM: 'xterm-256color' },
      });

      const terminal = {
        process: ptyProcess,
        dataCallback: onData,
        history: [],
      };

      // Pipe PTY output to the callback
      ptyProcess.onData((data) => {
        terminal.history.push(data);
        if (terminal.history.length > this.MAX_HISTORY) {
          terminal.history = terminal.history.slice(-this.MAX_HISTORY);
        }
        if (terminal.dataCallback) {
          terminal.dataCallback(data);
        }
      });

      ptyProcess.onExit(({ exitCode }) => {
        console.log(`🖥️  Terminal ${terminalId} for room ${roomId} exited with code ${exitCode}`);
        roomTerminals.delete(terminalId);
        if (roomTerminals.size === 0) {
          this.rooms.delete(roomId);
        }
      });

      roomTerminals.set(terminalId, terminal);
      console.log(`🖥️  Terminal ${terminalId} created for room ${roomId}`);
      return true;
    } catch (err) {
      console.error(`Failed to create terminal ${terminalId} for room ${roomId}:`, err.message);
      roomTerminals.delete(terminalId);
      return false;
    }
  }

  /**
   * Write data (user input) to a terminal.
   */
  writeToTerminal(roomId, terminalId, data) {
    const roomTerminals = this.rooms.get(roomId);
    if (!roomTerminals) {
      return;
    }
    const terminal = roomTerminals.get(terminalId);
    if (!terminal) {
      return;
    }
    if (!terminal.process) {
      return;
    }
    terminal.process.write(data);
  }

  /**
   * Resize a terminal.
   */
  resizeTerminal(roomId, terminalId, cols, rows) {
    const roomTerminals = this.rooms.get(roomId);
    if (roomTerminals) {
      const terminal = roomTerminals.get(terminalId);
      if (terminal?.process) {
        try {
          terminal.process.resize(cols, rows);
        } catch (err) {}
      }
    }
  }

  /**
   * Get buffered history for late joiners.
   */
  getHistory(roomId, terminalId) {
    const roomTerminals = this.rooms.get(roomId);
    if (roomTerminals) {
      const terminal = roomTerminals.get(terminalId);
      return terminal ? terminal.history.join('') : '';
    }
    return '';
  }

  /**
   * Check if a terminal is active.
   */
  hasTerminal(roomId, terminalId) {
    const roomTerminals = this.rooms.get(roomId);
    return roomTerminals ? roomTerminals.has(terminalId) : false;
  }
  
  /**
   * Get all active terminal IDs for a room.
   */
  getTerminalsForRoom(roomId) {
    const roomTerminals = this.rooms.get(roomId);
    return roomTerminals ? Array.from(roomTerminals.keys()) : [];
  }

  /**
   * Destroy a specific terminal.
   */
  async destroyTerminal(roomId, terminalId) {
    const roomTerminals = this.rooms.get(roomId);
    if (roomTerminals) {
      const terminal = roomTerminals.get(terminalId);
      if (terminal) {
        if (terminal.process) {
          try { terminal.process.kill(); } catch (err) {}
        }
        roomTerminals.delete(terminalId);
        console.log(`🖥️  Terminal ${terminalId} destroyed for room ${roomId}`);
      }
      
      // If no terminals left, clean up the master container and room files
      if (roomTerminals.size === 0) {
        try {
          execSync(`docker rm -f codehive-term-${roomId}`, { stdio: 'ignore' });
        } catch (e) {}

        this.rooms.delete(roomId);
        await diskManager.cleanupRoom(roomId);
      }
    }
  }

  /**
   * Destroy all terminals (for graceful shutdown).
   */
  destroyAll() {
    for (const [roomId, roomTerminals] of this.rooms.entries()) {
      for (const terminalId of roomTerminals.keys()) {
        this.destroyTerminal(roomId, terminalId);
      }
    }
  }
}

export default new TerminalManager();
