const logger = require('../utils/logger');

/**
 * FileService - Manages file sharing within rooms
 */
class FileService {
  constructor() {
    // Map of rooms where each room is a Map of files
    this.sharedFiles = new Map();
    logger.info('FileService initialized');
  }

  /**
   * Store a shared file
   * @param {string} roomId - Room identifier
   * @param {string} fileId - File identifier
   * @param {object} fileData - File metadata and content
   * @returns {boolean} - Success indicator
   */
  storeFile(roomId, fileId, fileData) {
    try {
      if (!this.sharedFiles.has(roomId)) {
        this.sharedFiles.set(roomId, new Map());
      }
      
      const roomFiles = this.sharedFiles.get(roomId);
      
      roomFiles.set(fileId, {
        ...fileData,
        sharedAt: new Date().toISOString()
      });
      
      logger.debug(`File ${fileId} stored in room ${roomId}`, { 
        roomId, 
        fileId,
        fileName: fileData.name,
        fileType: fileData.type,
        fileSize: fileData.content ? fileData.content.length : 'unknown'
      });
      
      return true;
    } catch (error) {
      logger.error(`Failed to store file ${fileId} in room ${roomId}`, {
        error: error.message,
        roomId,
        fileId
      });
      return false;
    }
  }

  /**
   * Get file data by ID
   * @param {string} roomId - Room identifier
   * @param {string} fileId - File identifier
   * @returns {object|null} - File data or null if not found
   */
  getFile(roomId, fileId) {
    if (!this.sharedFiles.has(roomId)) return null;
    
    const roomFiles = this.sharedFiles.get(roomId);
    const file = roomFiles.get(fileId);
    
    if (file) {
      logger.debug(`Retrieved file ${fileId} from room ${roomId}`, {
        roomId,
        fileId,
        fileName: file.name
      });
    }
    
    return file || null;
  }

  /**
   * Get all files in a room (without content)
   * @param {string} roomId - Room identifier
   * @returns {Array} - Array of file metadata without content
   */
  getRoomFiles(roomId) {
    if (!this.sharedFiles.has(roomId)) return [];
    
    const roomFiles = this.sharedFiles.get(roomId);
    const files = [];
    
    for (const [fileId, fileData] of roomFiles.entries()) {
      const { content, ...fileMetadata } = fileData;
      files.push({
        id: fileId,
        ...fileMetadata
      });
    }
    
    return files;
  }

  /**
   * Delete a file
   * @param {string} roomId - Room identifier
   * @param {string} fileId - File identifier
   * @returns {boolean} - Success indicator
   */
  deleteFile(roomId, fileId) {
    try {
      if (!this.sharedFiles.has(roomId)) return false;
      
      const roomFiles = this.sharedFiles.get(roomId);
      const result = roomFiles.delete(fileId);
      
      if (result) {
        logger.debug(`File ${fileId} deleted from room ${roomId}`, {
          roomId,
          fileId
        });
        
        // Clean up empty file maps
        if (roomFiles.size === 0) {
          this.sharedFiles.delete(roomId);
        }
      }
      
      return result;
    } catch (error) {
      logger.error(`Failed to delete file ${fileId} from room ${roomId}`, {
        error: error.message,
        roomId,
        fileId
      });
      return false;
    }
  }

  /**
   * Remove all files from a room
   * @param {string} roomId - Room identifier
   * @returns {number} - Number of files removed
   */
  clearRoomFiles(roomId) {
    try {
      if (!this.sharedFiles.has(roomId)) return 0;
      
      const roomFiles = this.sharedFiles.get(roomId);
      const fileCount = roomFiles.size;
      
      this.sharedFiles.delete(roomId);
      
      logger.info(`Cleared ${fileCount} files from room ${roomId}`, {
        roomId,
        fileCount
      });
      
      return fileCount;
    } catch (error) {
      logger.error(`Failed to clear files from room ${roomId}`, {
        error: error.message,
        roomId
      });
      return 0;
    }
  }
}

module.exports = new FileService();