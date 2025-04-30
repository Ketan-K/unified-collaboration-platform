const logger = require('../utils/logger');

/**
 * ChatService - Manages chat messages within rooms
 */
class ChatService {
  constructor() {
    // Store chat messages for rooms
    this.roomMessages = new Map();
    logger.info('ChatService initialized');
  }

  /**
   * Add a chat message to a room
   * @param {string} roomId - The room identifier
   * @param {object} message - The message object
   * @returns {boolean} - Success indicator
   */
  addChatMessage(roomId, message) {
    try {
      if (!this.roomMessages.has(roomId)) {
        this.roomMessages.set(roomId, []);
      }
      
      this.roomMessages.get(roomId).push(message);
      
      // Cap the number of stored messages to prevent memory bloat
      const maxMessages = 100;
      if (this.roomMessages.get(roomId).length > maxMessages) {
        this.roomMessages.get(roomId).shift(); // Remove oldest message
      }
      
      logger.debug(`Added chat message to room ${roomId}`, { roomId, messageId: message.id });
      return true;
    } catch (error) {
      logger.error(`Failed to add chat message to room ${roomId}`, { error: error.message, roomId });
      return false;
    }
  }

  /**
   * Get all chat messages for a room
   * @param {string} roomId - The room identifier
   * @param {number} limit - Max number of messages to return
   * @param {string} before - Message ID to paginate from
   * @returns {Array} - Array of message objects
   */
  getChatHistory(roomId, limit = 50, before = null) {
    if (!this.roomMessages.has(roomId)) {
      return [];
    }
    
    let messages = this.roomMessages.get(roomId);
    
    // If a 'before' message ID is specified, filter to get messages before it
    if (before) {
      const beforeIndex = messages.findIndex(msg => msg.id === before);
      if (beforeIndex > 0) {
        messages = messages.slice(0, beforeIndex);
      }
    }
    
    // Return the last 'limit' messages
    return messages.slice(-limit);
  }

  /**
   * Get a specific chat message
   * @param {string} roomId - The room identifier
   * @param {string} messageId - The message identifier
   * @returns {object|null} - Message object or null if not found
   */
  getChatMessage(roomId, messageId) {
    if (!this.roomMessages.has(roomId)) {
      return null;
    }
    
    const message = this.roomMessages.get(roomId).find(m => m.id === messageId);
    return message || null;
  }

  /**
   * Update a chat message's content
   * @param {string} roomId - The room identifier
   * @param {string} messageId - The message identifier
   * @param {object} updates - Updates to apply to the message
   * @returns {boolean} - Success indicator
   */
  updateChatMessage(roomId, messageId, updates) {
    try {
      if (!this.roomMessages.has(roomId)) {
        return false;
      }
      
      const messageIndex = this.roomMessages.get(roomId).findIndex(m => m.id === messageId);
      if (messageIndex === -1) {
        return false;
      }
      
      // Update the message
      const message = this.roomMessages.get(roomId)[messageIndex];
      this.roomMessages.get(roomId)[messageIndex] = { ...message, ...updates };
      
      logger.debug(`Updated message ${messageId} in room ${roomId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to update message ${messageId} in room ${roomId}`, { error: error.message, roomId, messageId });
      return false;
    }
  }

  /**
   * Delete a chat message
   * @param {string} roomId - The room identifier
   * @param {string} messageId - The message identifier
   * @returns {boolean} - Success indicator
   */
  deleteChatMessage(roomId, messageId) {
    try {
      if (!this.roomMessages.has(roomId)) {
        return false;
      }
      
      const messages = this.roomMessages.get(roomId);
      const initialLength = messages.length;
      
      // Filter out the message to delete
      const filteredMessages = messages.filter(m => m.id !== messageId);
      
      if (filteredMessages.length === initialLength) {
        // Message wasn't found
        return false;
      }
      
      this.roomMessages.set(roomId, filteredMessages);
      
      logger.debug(`Deleted message ${messageId} from room ${roomId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete message ${messageId} from room ${roomId}`, { error: error.message, roomId, messageId });
      return false;
    }
  }

  /**
   * Add a reaction to a message
   * @param {string} roomId - The room identifier
   * @param {string} messageId - The message identifier
   * @param {string} userId - The user identifier adding the reaction
   * @param {string} reaction - The reaction to add
   * @returns {boolean} - Success indicator
   */
  addMessageReaction(roomId, messageId, userId, reaction) {
    try {
      if (!this.roomMessages.has(roomId)) {
        return false;
      }
      
      const messageIndex = this.roomMessages.get(roomId).findIndex(m => m.id === messageId);
      if (messageIndex === -1) {
        return false;
      }
      
      // Get the message
      const message = this.roomMessages.get(roomId)[messageIndex];
      
      // Initialize reactions if they don't exist
      if (!message.reactions) {
        message.reactions = {};
      }
      
      // Initialize the specific reaction if it doesn't exist
      if (!message.reactions[reaction]) {
        message.reactions[reaction] = [];
      }
      
      // Add the user's reaction if not already added
      if (!message.reactions[reaction].includes(userId)) {
        message.reactions[reaction].push(userId);
      }
      
      // Update the message in the store
      this.roomMessages.get(roomId)[messageIndex] = message;
      
      logger.debug(`Added reaction to message ${messageId} in room ${roomId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to add reaction to message ${messageId} in room ${roomId}`, { error: error.message, roomId, messageId });
      return false;
    }
  }

  /**
   * Clean up messages for deleted rooms
   * @param {string} roomId - Room identifier
   */
  cleanupRoomMessages(roomId) {
    if (this.roomMessages.has(roomId)) {
      this.roomMessages.delete(roomId);
      logger.debug(`Cleaned up messages for room ${roomId}`);
    }
  }
}

module.exports = new ChatService();