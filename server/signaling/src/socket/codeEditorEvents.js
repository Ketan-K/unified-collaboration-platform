const logger = require('../utils/logger');
const roomService = require('../services/RoomService');

/**
 * Register code editor event handlers
 * @param {object} io - Socket.IO server instance
 * @param {object} socket - Socket connection
 */
function register(io, socket) {
  /**
   * Handle code editor updates
   */
  socket.on('code-update', ({ roomId, userId, content, language }) => {
    try {
      // Validate required fields
      if (!roomId || !userId) {
        logger.warn('Invalid code update data', {
          socketId: socket.id,
          roomId,
          userId
        });
        return;
      }
      
      logger.debug(`Code editor update from ${userId} in room ${roomId}`, {
        roomId,
        userId,
        hasContent: !!content,
        language
      });
      
      // Store the current code state in the room service if needed
      if (content !== undefined || language !== undefined) {
        const updates = {};
        if (content !== undefined) updates.content = content;
        if (language !== undefined) updates.language = language;
        
        // Update code in room data
        roomService.updateRoomCode(roomId, updates);
      }
      
      // Forward update to all other users in the room
      socket.to(roomId).emit('code-update', {
        content,
        language,
        updatedAt: Date.now(),
        updatedBy: userId
      });
    } catch (error) {
      logger.error('Error handling code editor update', {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId
      });
    }
  });
  
  /**
   * Request existing code editor content (useful when joining room)
   */
  socket.on('request-code-content', ({ roomId, userId }) => {
    try {
      if (!roomId || !userId) return;
      
      // Get current code editor data from room service
      const codeData = roomService.getRoomCode(roomId);
      
      // Send only to the requesting client
      socket.emit('code-content', {
        ...codeData,
        timestamp: Date.now()
      });
      
      logger.debug(`Sent code content to user ${userId} in room ${roomId}`);
    } catch (error) {
      logger.error('Error handling code content request', {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId
      });
    }
  });
  
  /**
   * Handle code editor undo operation
   */
  socket.on('code-undo', ({ roomId, userId }) => {
    try {
      if (!roomId || !userId) return;
      
      // Attempt to undo the last change
      const previousState = roomService.undoCodeChange(roomId);
      
      if (previousState) {
        // Notify all clients about the undo operation
        io.to(roomId).emit('code-update', {
          content: previousState.content,
          language: previousState.language,
          updatedAt: Date.now(),
          updatedBy: userId,
          isUndo: true
        });
        
        logger.debug(`User ${userId} performed code undo in room ${roomId}`);
      }
    } catch (error) {
      logger.error('Error handling code undo', {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId
      });
    }
  });
}

module.exports = { register };
