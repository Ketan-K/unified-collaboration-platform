const logger = require('../utils/logger');
const roomService = require('../services/RoomService');

/**
 * Register whiteboard-related event handlers
 * @param {object} io - Socket.IO server instance
 * @param {object} socket - Socket connection
 */
function register(io, socket) {
  /**
   * Handle whiteboard drawing events
   */
  socket.on('whiteboard-draw', ({ roomId, userId, drawData }) => {
    try {
      // Validate draw data
      if (!drawData || !roomId) {
        return; // Silently fail for high-frequency events
      }
      
      // Add metadata to the draw event
      const drawEvent = {
        ...drawData,
        userId,
        timestamp: Date.now()
      };
      
      // Store the drawing element if persistence is enabled
      if (drawData.shouldPersist !== false) {
        roomService.addWhiteboardElement(roomId, drawEvent);
      }
      
      // Broadcast to all other users in the room
      socket.to(roomId).emit('whiteboard-draw', drawEvent);
    } catch (error) {
      logger.debug('Error handling whiteboard drawing', {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId
      });
      
      // Don't emit errors back to clients for high-frequency events
    }
  });
  
  /**
   * Handle whiteboard clear event
   */
  socket.on('whiteboard-clear', ({ roomId, userId }) => {
    try {
      logger.debug(`User ${userId} cleared whiteboard in room ${roomId}`, {
        socketId: socket.id,
        roomId,
        userId
      });
      
      // Clear whiteboard data in storage
      roomService.clearWhiteboard(roomId);
      
      // Broadcast clear event to all users in room
      socket.to(roomId).emit('whiteboard-cleared', {
        clearedBy: userId,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Error handling whiteboard clear', {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId
      });
      
      socket.emit('whiteboard-error', {
        error: 'Failed to clear whiteboard',
        details: error.message
      });
    }
  });
  
  /**
   * Handle whiteboard element deletion
   */
  socket.on('whiteboard-delete-element', ({ roomId, userId, elementId }) => {
    try {
      // Delete element from storage
      roomService.removeWhiteboardElement(roomId, elementId);
      
      logger.debug(`User ${userId} deleted whiteboard element ${elementId}`, {
        socketId: socket.id,
        roomId,
        userId,
        elementId
      });
      
      // Broadcast element deletion to all users in room
      socket.to(roomId).emit('whiteboard-element-deleted', {
        elementId,
        deletedBy: userId,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Error handling whiteboard element deletion', {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId,
        elementId
      });
      
      socket.emit('whiteboard-error', {
        error: 'Failed to delete whiteboard element',
        details: error.message
      });
    }
  });
  
  /**
   * Handle whiteboard element update (move, resize, etc.)
   */
  socket.on('whiteboard-update-element', ({ roomId, userId, elementId, changes }) => {
    try {
      // Update element in storage
      roomService.updateWhiteboardElement(roomId, elementId, changes);
      
      // Broadcast element update to all users in room
      socket.to(roomId).emit('whiteboard-element-updated', {
        elementId,
        changes,
        updatedBy: userId,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Error handling whiteboard element update', {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId,
        elementId
      });
      
      socket.emit('whiteboard-error', {
        error: 'Failed to update whiteboard element',
        details: error.message
      });
    }
  });
  
  /**
   * Handle request for whiteboard state
   */
  socket.on('whiteboard-get-state', ({ roomId, userId }) => {
    try {
      // Get current whiteboard state from storage
      const whiteboardState = roomService.getWhiteboardState(roomId);
      
      logger.debug(`Sending whiteboard state to user ${userId}`, {
        socketId: socket.id,
        roomId,
        userId,
        elementCount: whiteboardState.length
      });
      
      // Send state only to the requesting user
      socket.emit('whiteboard-state', {
        elements: whiteboardState,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Error fetching whiteboard state', {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId
      });
      
      socket.emit('whiteboard-error', {
        error: 'Failed to get whiteboard state',
        details: error.message
      });
    }
  });
  
  /**
   * Handle cursor position updates for collaborative editing
   */
  socket.on('whiteboard-cursor', ({ roomId, userId, position }) => {
    try {
      // Broadcast cursor position to all other users in room
      socket.to(roomId).emit('whiteboard-cursor-update', {
        userId,
        position,
        timestamp: Date.now()
      });
    } catch (error) {
      // Silent fail for non-critical feature
      logger.debug('Error handling cursor position update', {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId
      });
    }
  });
  
  /**
   * Handle whiteboard tool change
   */
  socket.on('whiteboard-tool-change', ({ roomId, userId, tool, options }) => {
    try {
      // This is mainly for multiplayer awareness
      socket.to(roomId).emit('user-tool-change', {
        userId,
        tool,
        options,
        timestamp: Date.now()
      });
    } catch (error) {
      // Silent fail for non-critical feature
      logger.debug('Error handling tool change', {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId
      });
    }
  });
  
  /**
   * Handle saving whiteboard as image
   */
  socket.on('whiteboard-save-image', ({ roomId, userId, imageData }) => {
    try {
      const imageId = `wb_img_${Date.now()}`;
      
      // Store image data
      roomService.saveWhiteboardImage(roomId, imageId, {
        data: imageData,
        createdBy: userId,
        createdAt: Date.now()
      });
      
      logger.info(`User ${userId} saved whiteboard as image in room ${roomId}`, {
        socketId: socket.id,
        roomId,
        userId,
        imageId
      });
      
      // Notify the user that the image was saved successfully
      socket.emit('whiteboard-image-saved', {
        imageId,
        success: true
      });
    } catch (error) {
      logger.error('Error saving whiteboard as image', {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId
      });
      
      socket.emit('whiteboard-error', {
        error: 'Failed to save whiteboard as image',
        details: error.message
      });
    }
  });
  
  /**
   * Handle adding a text element to whiteboard
   */
  socket.on('whiteboard-add-text', ({ roomId, userId, textData }) => {
    try {
      // Generate a unique ID for the text element
      const elementId = `text_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Create the text element
      const textElement = {
        id: elementId,
        type: 'text',
        ...textData,
        createdBy: userId,
        createdAt: Date.now()
      };
      
      // Store the text element
      roomService.addWhiteboardElement(roomId, textElement);
      
      logger.debug(`User ${userId} added text element to whiteboard`, {
        socketId: socket.id,
        roomId,
        userId,
        elementId
      });
      
      // Broadcast to all users in the room
      io.to(roomId).emit('whiteboard-text-added', textElement);
    } catch (error) {
      logger.error('Error adding text to whiteboard', {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId
      });
      
      socket.emit('whiteboard-error', {
        error: 'Failed to add text element',
        details: error.message
      });
    }
  });
}

module.exports = { register };