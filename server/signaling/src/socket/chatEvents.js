const logger = require('../utils/logger');
const roomService = require('../services/RoomService');

/**
 * Register chat-related event handlers
 * @param {object} io - Socket.IO server instance
 * @param {object} socket - Socket connection
 */
function register(io, socket) {
  /**
   * Handle new chat messages
   */
  socket.on('chat-message', ({ roomId, userId, message }) => {
    try {
      // Validate inputs
      if (!roomId || !userId || !message || !message.content) {
        socket.emit('chat-error', {
          error: 'Invalid message format'
        });
        return;
      }

      // Create message object with additional metadata
      const chatMessage = {
        id: generateMessageId(),
        senderId: userId,
        content: message.content,
        timestamp: Date.now(),
        type: message.type || 'text',
        replyTo: message.replyTo || null
      };
      
      logger.debug(`Chat message from user ${userId} in room ${roomId}`, {
        roomId,
        userId,
        messageId: chatMessage.id,
        type: chatMessage.type
      });
      
      // Store the message in the room history (implementation depends on storage method)
      roomService.addChatMessage(roomId, chatMessage);
      
      // Broadcast the message to all users in the room
      io.to(roomId).emit('new-chat-message', chatMessage);
    } catch (error) {
      logger.error(`Error handling chat message`, {
        error: error.message,
        roomId,
        userId
      });
      
      socket.emit('chat-error', {
        error: 'Failed to send message'
      });
    }
  });
  
  /**
   * Handle message editing
   */
  socket.on('edit-message', ({ roomId, userId, messageId, newContent }) => {
    try {
      // Check if message exists and belongs to the user
      const message = roomService.getChatMessage(roomId, messageId);
      
      if (!message) {
        socket.emit('chat-error', {
          error: 'Message not found'
        });
        return;
      }
      
      if (message.senderId !== userId) {
        logger.warn(`User ${userId} attempted to edit message they don't own`, {
          roomId,
          userId,
          messageId
        });
        
        socket.emit('chat-error', {
          error: 'Permission denied'
        });
        return;
      }
      
      // Update message in storage
      roomService.updateChatMessage(roomId, messageId, {
        content: newContent,
        edited: true,
        editedAt: Date.now()
      });
      
      logger.debug(`User ${userId} edited message ${messageId}`, {
        roomId,
        userId,
        messageId
      });
      
      // Notify all users about the edit
      io.to(roomId).emit('message-edited', {
        messageId,
        newContent,
        editedAt: Date.now()
      });
    } catch (error) {
      logger.error(`Error editing message`, {
        error: error.message,
        roomId,
        userId,
        messageId
      });
      
      socket.emit('chat-error', {
        error: 'Failed to edit message'
      });
    }
  });
  
  /**
   * Handle message deletion
   */
  socket.on('delete-message', ({ roomId, userId, messageId }) => {
    try {
      // Check if message exists
      const message = roomService.getChatMessage(roomId, messageId);
      
      if (!message) {
        socket.emit('chat-error', {
          error: 'Message not found'
        });
        return;
      }
      
      // Check if user has permission (is sender or moderator)
      const user = roomService.getRoomParticipant(roomId, userId);
      const isOwner = message.senderId === userId;
      const isModerator = user && user.role === 'moderator';
      
      if (!isOwner && !isModerator) {
        logger.warn(`User ${userId} attempted to delete message without permission`, {
          roomId,
          userId,
          messageId,
          senderId: message.senderId
        });
        
        socket.emit('chat-error', {
          error: 'Permission denied'
        });
        return;
      }
      
      // Remove message from storage
      roomService.deleteChatMessage(roomId, messageId);
      
      logger.debug(`Message ${messageId} deleted by user ${userId}`, {
        roomId,
        userId,
        messageId,
        byModerator: !isOwner && isModerator
      });
      
      // Notify all users about the deletion
      io.to(roomId).emit('message-deleted', {
        messageId,
        deletedAt: Date.now(),
        deletedBy: userId
      });
    } catch (error) {
      logger.error(`Error deleting message`, {
        error: error.message,
        roomId,
        userId,
        messageId
      });
      
      socket.emit('chat-error', {
        error: 'Failed to delete message'
      });
    }
  });
  
  /**
   * Handle user typing indicator
   */
  socket.on('typing-indicator', ({ roomId, userId, isTyping }) => {
    try {
      // Broadcast typing indicator to all other users in the room
      socket.to(roomId).emit('user-typing', {
        userId,
        isTyping,
        timestamp: Date.now()
      });
    } catch (error) {
      // Silent fail for non-critical feature
      logger.debug(`Error handling typing indicator`, {
        error: error.message,
        roomId,
        userId
      });
    }
  });

  /**
   * Handle message reactions (like, heart, etc.)
   */
  socket.on('message-reaction', ({ roomId, userId, messageId, reaction }) => {
    try {
      // Update message with reaction
      roomService.addMessageReaction(roomId, messageId, userId, reaction);
      
      // Broadcast the reaction to all users in the room
      io.to(roomId).emit('new-message-reaction', {
        messageId,
        userId,
        reaction,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error(`Error handling message reaction`, {
        error: error.message,
        roomId,
        userId,
        messageId
      });
      
      socket.emit('chat-error', {
        error: 'Failed to add reaction'
      });
    }
  });
  
  /**
   * Request chat history
   */
  socket.on('request-chat-history', ({ roomId, userId, limit, before }) => {
    try {
      // Fetch chat history based on parameters
      const history = roomService.getChatHistory(roomId, limit || 50, before);
      
      // Send history only to the requesting user
      socket.emit('chat-history', {
        messages: history,
        timestamp: Date.now()
      });
      
      logger.debug(`Chat history sent to user ${userId}`, {
        roomId,
        userId,
        messageCount: history.length
      });
    } catch (error) {
      logger.error(`Error fetching chat history`, {
        error: error.message,
        roomId,
        userId
      });
      
      socket.emit('chat-error', {
        error: 'Failed to load chat history'
      });
    }
  });
}

/**
 * Generate a unique message ID
 * @returns {string} Unique message ID
 */
function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = { register };