const logger = require('../utils/logger');
const fileService = require('../services/FileService');
const { v4: uuidv4 } = require('uuid');

/**
 * Register file sharing event handlers
 * @param {object} io - Socket.IO server instance
 * @param {object} socket - Socket connection
 */
function register(io, socket) {
  /**
   * Handle file sharing request
   */
  socket.on('share-file', ({ roomId, userId, fileInfo }) => {
    try {
      logger.info(`User ${userId} sharing file in room ${roomId}`, {
        socketId: socket.id,
        roomId,
        userId,
        fileName: fileInfo.name,
        fileSize: fileInfo.size,
        fileType: fileInfo.type
      });
      
      // Generate unique ID for the file
      const fileId = `file_${uuidv4()}`;
      
      // Store file metadata (not content yet)
      const fileData = {
        name: fileInfo.name,
        type: fileInfo.type,
        size: fileInfo.size,
        sharedBy: userId,
        preview: fileInfo.preview || null // Thumbnail or preview if available
      };
      
      fileService.storeFile(roomId, fileId, fileData);
      
      // Inform the sender that the file is ready to be uploaded
      socket.emit('file-ready-for-upload', {
        fileId,
        status: 'ready'
      });
      
      // Inform others in the room about new file (but not content yet)
      socket.to(roomId).emit('new-file-shared', {
        fileId,
        fileInfo: {
          name: fileData.name,
          type: fileData.type,
          size: fileData.size,
          sharedBy: userId,
          preview: fileData.preview
        },
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Error handling file share request', {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId
      });
      
      socket.emit('file-error', {
        error: 'Failed to initiate file sharing',
        details: error.message
      });
    }
  });
  
  /**
   * Handle file content upload 
   * Typically done in chunks for large files
   */
  socket.on('file-chunk', ({ roomId, fileId, chunk, chunkIndex, totalChunks }) => {
    try {
      // Get existing file data
      const fileData = fileService.getFile(roomId, fileId);
      
      if (!fileData) {
        socket.emit('file-error', {
          fileId,
          error: 'File not found'
        });
        return;
      }
      
      // Initialize content array if first chunk
      if (chunkIndex === 0) {
        fileData.content = [];
        fileData.receivedChunks = 0;
      }
      
      // Store this chunk
      fileData.content[chunkIndex] = chunk;
      fileData.receivedChunks = (fileData.receivedChunks || 0) + 1;
      
      // Update file in storage
      fileService.storeFile(roomId, fileId, fileData);
      
      // Log progress for large files
      if (totalChunks > 10 && chunkIndex % Math.ceil(totalChunks / 10) === 0) {
        logger.debug(`File upload progress: ${Math.floor((chunkIndex / totalChunks) * 100)}%`, {
          socketId: socket.id,
          fileId,
          roomId,
          progress: Math.floor((chunkIndex / totalChunks) * 100)
        });
      }
      
      // Check if this was the last chunk
      if (fileData.receivedChunks === totalChunks) {
        // Combine chunks if needed
        if (Array.isArray(fileData.content)) {
          fileData.content = fileData.content.join('');
        }
        
        // Mark file as complete
        fileData.status = 'complete';
        fileData.uploadedAt = Date.now();
        
        // Update file in storage
        fileService.storeFile(roomId, fileId, fileData);
        
        logger.info(`File upload complete: ${fileData.name}`, {
          socketId: socket.id,
          fileId,
          roomId,
          fileName: fileData.name,
          fileSize: fileData.size
        });
        
        // Notify sender that upload is complete
        socket.emit('file-upload-complete', {
          fileId,
          status: 'complete'
        });
        
        // Notify all users in room that file is available
        io.to(roomId).emit('file-available', {
          fileId,
          fileInfo: {
            name: fileData.name,
            type: fileData.type,
            size: fileData.size,
            sharedBy: fileData.sharedBy,
            preview: fileData.preview,
            uploadedAt: fileData.uploadedAt
          }
        });
      }
    } catch (error) {
      logger.error('Error handling file chunk', {
        error: error.message,
        socketId: socket.id,
        fileId,
        roomId,
        chunkIndex
      });
      
      socket.emit('file-error', {
        fileId,
        error: 'Failed to process file chunk',
        details: error.message
      });
    }
  });
  
  /**
   * Handle file download request
   */
  socket.on('request-file', ({ roomId, fileId }) => {
    try {
      // Get file data
      const fileData = fileService.getFile(roomId, fileId);
      
      if (!fileData) {
        socket.emit('file-error', {
          fileId,
          error: 'File not found or no longer available'
        });
        return;
      }
      
      logger.debug(`User requested file download: ${fileData.name}`, {
        socketId: socket.id,
        fileId,
        roomId,
        fileName: fileData.name
      });
      
      // Send file content directly to the requesting user
      socket.emit('file-data', {
        fileId,
        fileInfo: {
          name: fileData.name,
          type: fileData.type,
          size: fileData.size,
          sharedBy: fileData.sharedBy
        },
        content: fileData.content
      });
    } catch (error) {
      logger.error('Error handling file download request', {
        error: error.message,
        socketId: socket.id,
        fileId,
        roomId
      });
      
      socket.emit('file-error', {
        fileId,
        error: 'Failed to retrieve file',
        details: error.message
      });
    }
  });
  
  /**
   * Handle file deletion
   */
  socket.on('delete-file', ({ roomId, userId, fileId }) => {
    try {
      // Get file data
      const fileData = fileService.getFile(roomId, fileId);
      
      if (!fileData) {
        socket.emit('file-error', {
          fileId,
          error: 'File not found'
        });
        return;
      }
      
      // Check if user has permission to delete (owner or moderator)
      if (fileData.sharedBy !== userId && !isUserModerator(roomId, userId)) {
        logger.warn(`User ${userId} attempted to delete file without permission`, {
          socketId: socket.id,
          fileId,
          roomId,
          userId,
          fileOwner: fileData.sharedBy
        });
        
        socket.emit('file-error', {
          fileId,
          error: 'Permission denied'
        });
        return;
      }
      
      // Delete the file
      fileService.deleteFile(roomId, fileId);
      
      logger.info(`File deleted: ${fileData.name}`, {
        socketId: socket.id,
        fileId,
        roomId,
        userId,
        fileName: fileData.name
      });
      
      // Notify all users in the room
      io.to(roomId).emit('file-deleted', {
        fileId,
        deletedBy: userId,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Error handling file deletion', {
        error: error.message,
        socketId: socket.id,
        fileId,
        roomId,
        userId
      });
      
      socket.emit('file-error', {
        fileId,
        error: 'Failed to delete file',
        details: error.message
      });
    }
  });
  
  /**
   * Request list of available files in a room
   */
  socket.on('list-files', ({ roomId }) => {
    try {
      const files = fileService.getRoomFiles(roomId);
      
      logger.debug(`Sending file list for room ${roomId}`, {
        socketId: socket.id,
        roomId,
        fileCount: files.length
      });
      
      // Send file list to the requesting user
      socket.emit('file-list', {
        files,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Error fetching file list', {
        error: error.message,
        socketId: socket.id,
        roomId
      });
      
      socket.emit('file-error', {
        error: 'Failed to retrieve file list',
        details: error.message
      });
    }
  });
}

/**
 * Helper function to check if user is a moderator
 * @param {string} roomId - Room identifier
 * @param {string} userId - User identifier
 * @returns {boolean} - True if user is moderator
 */
function isUserModerator(roomId, userId) {
  try {
    const roomService = require('../services/RoomService');
    const user = roomService.getRoomParticipant(roomId, userId);
    return user && user.role === 'moderator';
  } catch (error) {
    return false;
  }
}

module.exports = { register };