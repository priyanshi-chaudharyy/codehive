import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const BASE_DIR = path.join(os.tmpdir(), 'codehive_rooms');

/**
 * Ensures the base directory exists.
 */
async function ensureBaseDir() {
  try {
    await fs.mkdir(BASE_DIR, { recursive: true });
  } catch (err) {
    // ignore if already exists
  }
}

/**
 * Recursively builds the file path given the flat Map of files.
 */
function buildFilePath(filesMap, fileId) {
  const file = filesMap.get(fileId);
  if (!file) return null;

  if (file.parentId === null) {
    return file.name;
  }

  const parentPath = buildFilePath(filesMap, file.parentId);
  return parentPath ? path.join(parentPath, file.name) : file.name;
}

class DiskManager {
  constructor() {
    this.locks = new Map();
  }

  async _acquireLock(roomId) {
    if (!this.locks.has(roomId)) {
      this.locks.set(roomId, Promise.resolve());
    }
    const currentPromise = this.locks.get(roomId);
    let release;
    const nextPromise = new Promise(resolve => { release = resolve; });
    this.locks.set(roomId, currentPromise.then(() => nextPromise));
    await currentPromise;
    return release;
  }

  /**
   * Syncs the entire room file tree to disk.
   */
  async syncRoomToDisk(roomId, filesMap) {
    const release = await this._acquireLock(roomId);
    try {
      await ensureBaseDir();
      const roomDir = path.join(BASE_DIR, roomId);

      try {
        // Clean up existing directory if it exists
        await fs.rm(roomDir, { recursive: true, force: true });
      } catch (err) {}

      await fs.mkdir(roomDir, { recursive: true });

      for (const [fileId, file] of filesMap.entries()) {
        const relPath = buildFilePath(filesMap, fileId);
        if (!relPath) continue;

        const absPath = path.join(roomDir, relPath);

        if (file.type === 'folder') {
          try {
            await fs.mkdir(absPath, { recursive: true });
          } catch (err) {
            if (err.code !== 'EACCES' && err.code !== 'EPERM') {
              throw err;
            }
          }
        }
      }

      for (const [fileId, file] of filesMap.entries()) {
        if (file.type !== 'file') continue;
        
        const relPath = buildFilePath(filesMap, fileId);
        if (!relPath) continue;

        const absPath = path.join(roomDir, relPath);
        try {
          await fs.mkdir(path.dirname(absPath), { recursive: true });
          await fs.writeFile(absPath, file.content || '');
        } catch (err) {
          if (err.code !== 'EACCES' && err.code !== 'EPERM') {
            throw err;
          }
          // Ignore permission errors caused by Docker writing root-owned files
        }
      }

      return roomDir;
    } finally {
      release();
    }
  }

  /**
   * Updates a specific file's content on disk.
   */
  async updateFile(roomId, filesMap, fileId, content) {
    const release = await this._acquireLock(roomId);
    try {
      const roomDir = path.join(BASE_DIR, roomId);
      const relPath = buildFilePath(filesMap, fileId);
      if (!relPath) return;

      const absPath = path.join(roomDir, relPath);
      await fs.mkdir(path.dirname(absPath), { recursive: true });
      await fs.writeFile(absPath, content || '');
    } catch (err) {
      console.error(`DiskSync: Failed to update file`, err);
    } finally {
      release();
    }
  }

  /**
   * Deletes a file or folder on disk.
   */
  async deleteFile(roomId, filesMap, fileId) {
    const release = await this._acquireLock(roomId);
    try {
      const roomDir = path.join(BASE_DIR, roomId);
      const relPath = buildFilePath(filesMap, fileId);
      if (!relPath) return;

      const absPath = path.join(roomDir, relPath);
      await fs.rm(absPath, { recursive: true, force: true });
    } catch (err) {
      console.error(`DiskSync: Failed to delete file`, err);
    } finally {
      release();
    }
  }

  /**
   * Renames a file or folder on disk.
   */
  async renameFile(roomId, filesMap, fileId, newName) {
    // Just re-sync the whole tree to be safe, but call the internal method without re-locking
    // Wait, syncRoomToDisk acquires a lock! So we must release first or just not use lock here and let syncRoomToDisk lock it.
    await this.syncRoomToDisk(roomId, filesMap);
  }

  /**
   * Creates a new file or folder on disk.
   */
  async createFile(roomId, filesMap, fileId) {
    await this.syncRoomToDisk(roomId, filesMap);
  }

  /**
   * Moves a file or folder on disk.
   */
  async moveFile(roomId, filesMap, fileId) {
    await this.syncRoomToDisk(roomId, filesMap);
  }

  /**
   * Cleans up the room directory.
   */
  async cleanupRoom(roomId) {
    const release = await this._acquireLock(roomId);
    try {
      const roomDir = path.join(BASE_DIR, roomId);
      await fs.rm(roomDir, { recursive: true, force: true });
    } catch (err) {
    } finally {
      release();
    }
  }
}

export default new DiskManager();
