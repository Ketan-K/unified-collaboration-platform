const logger = require('../utils/logger');
const chatService = require('./ChatService');
const whiteboardService = require('./WhiteboardService');
const codeEditorService = require('./CodeEditorService');
const fileService = require('./FileService');

/**
 * RoomService - Manages rooms and participants for the signaling server
 */
class RoomService {
  constructor() {
    // Map of rooms where each room is a Map of users
    this.rooms = new Map();
    logger.info('RoomService initialized');
  }

  /**
   * Create a room or return existing one
   * @param {string} roomId - The room identifier
   * @returns {Map} - The room Map object
   */
  getOrCreateRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      logger.debug(`Creating new room: ${roomId}`);
      this.rooms.set(roomId, new Map());
    }
    return this.rooms.get(roomId);
  }

  /**
   * Add a user to a room
   * @param {string} roomId - The room identifier
   * @param {string} userId - The user identifier
   * @param {object} userData - User data including socket ID, name, etc.
   * @returns {boolean} - Success indicator
   */
  addUserToRoom(roomId, userId, userData) {
    try {
      const room = this.getOrCreateRoom(roomId);
      room.set(userId, {
        id: userId,
        ...userData,
        joinedAt: new Date().toISOString()
      });
      logger.debug(`User ${userId} added to room ${roomId}`, { userId, roomId });
      return true;
    } catch (error) {
      logger.error(`Failed to add user ${userId} to room ${roomId}`, { error: error.message, userId, roomId });
      return false;
    }
  }

  /**
   * Remove a user from a room
   * @param {string} roomId - The room identifier
   * @param {string} userId - The user identifier
   * @returns {object|null} - Removed user data or null
   */
  removeUserFromRoom(roomId, userId) {
    try {
      if (!this.rooms.has(roomId)) return null;
      
      const room = this.rooms.get(roomId);
      const user = room.get(userId);
      
      if (!user) return null;
      
      room.delete(userId);
      logger.debug(`User ${userId} removed from room ${roomId}`, { userId, roomId });
      
      // Clean up empty rooms
      if (room.size === 0) {
        this.cleanupRoom(roomId);
      }
      
      return user;
    } catch (error) {
      logger.error(`Failed to remove user ${userId} from room ${roomId}`, { error: error.message, userId, roomId });
      return null;
    }
  }

  /**
   * Clean up a room and its associated data
   * @param {string} roomId - The room identifier
   */
  cleanupRoom(roomId) {
    try {
      this.rooms.delete(roomId);
      
      // Delegate cleanup to specialized services
      chatService.cleanupRoomMessages(roomId);
      whiteboardService.cleanupWhiteboardData(roomId);
      codeEditorService.cleanupCodeEditorData(roomId);
      fileService.clearRoomFiles(roomId);
      
      logger.info(`Room ${roomId} cleaned up completely`);
    } catch (error) {
      logger.error(`Error cleaning up room ${roomId}`, { error: error.message, roomId });
    }
  }

  /**
   * Get all users in a room
   * @param {string} roomId - The room identifier
   * @returns {Array} - Array of user objects
   */
  getRoomParticipants(roomId) {
    if (!this.rooms.has(roomId)) return [];
    return Array.from(this.rooms.get(roomId).values());
  }

  /**
   * Get a specific user in a room by user ID
   * @param {string} roomId - The room identifier
   * @param {string} userId - The user identifier
   * @returns {object|null} - User object or null if not found
   */
  getRoomParticipant(roomId, userId) {
    if (!this.rooms.has(roomId)) return null;
    const room = this.rooms.get(roomId);
    return room.get(userId) || null;
  }

  /**
   * Find a user in any room by socket ID
   * @param {string} socketId - The socket ID to look for
   * @returns {object|null} - User data and room ID, or null if not found
   */
  findUserBySocketId(socketId) {
    for (const [roomId, room] of this.rooms.entries()) {
      for (const [userId, user] of room.entries()) {
        if (user.socketId === socketId) {
          return { user, userId, roomId };
        }
      }
    }
    return null;
  }

  /**
   * Update user data in a room
   * @param {string} roomId - The room identifier
   * @param {string} userId - The user identifier
   * @param {object} updates - User data updates
   * @returns {boolean} - Success indicator
   */
  updateUserData(roomId, userId, updates) {
    try {
      if (!this.rooms.has(roomId)) return false;
      
      const room = this.rooms.get(roomId);
      if (!room.has(userId)) return false;
      
      const user = room.get(userId);
      room.set(userId, { ...user, ...updates });
      
      logger.debug(`Updated user ${userId} data in room ${roomId}`, { userId, roomId });
      return true;
    } catch (error) {
      logger.error(`Failed to update user ${userId} in room ${roomId}`, { error: error.message, userId, roomId });
      return false;
    }
  }

  /**
   * Update the WebRTC connection state between two peers
   * @param {string} roomId - The room identifier
   * @param {string} userId - The user identifier
   * @param {string} peerId - The peer identifier
   * @param {string} state - The connection state
   * @returns {boolean} - Success indicator
   */
  updatePeerConnectionState(roomId, userId, peerId, state) {
    try {
      if (!this.rooms.has(roomId)) {
        logger.warn(`Cannot update peer connection state: room ${roomId} not found`);
        return false;
      }
      
      const room = this.rooms.get(roomId);
      const user = room.get(userId);
      const peer = room.get(peerId);
      
      if (!user) {
        logger.warn(`Cannot update peer connection state: user ${userId} not found in room ${roomId}`);
        return false;
      }
      
      if (!peer) {
        logger.warn(`Cannot update peer connection state: peer ${peerId} not found in room ${roomId}`);
        return false;
      }
      
      // Initialize peer connections map if it doesn't exist
      if (!user.peerConnections) {
        user.peerConnections = new Map();
      }
      
      // Update the connection state
      user.peerConnections.set(peerId, {
        state,
        updatedAt: new Date().toISOString()
      });
      
      logger.debug(`Updated connection state between ${userId} and ${peerId} to ${state}`, {
        roomId,
        userId,
        peerId,
        state
      });
      
      return true;
    } catch (error) {
      logger.error(`Error updating peer connection state`, {
        error: error.message,
        roomId,
        userId,
        peerId,
        state
      });
      return false;
    }
  }

  // -------- Delegated Methods --------

  // Chat Methods
  addChatMessage(roomId, message) {
    return chatService.addChatMessage(roomId, message);
  }

  getChatHistory(roomId, limit = 50, before = null) {
    return chatService.getChatHistory(roomId, limit, before);
  }

  getChatMessage(roomId, messageId) {
    return chatService.getChatMessage(roomId, messageId);
  }

  updateChatMessage(roomId, messageId, updates) {
    return chatService.updateChatMessage(roomId, messageId, updates);
  }

  deleteChatMessage(roomId, messageId) {
    return chatService.deleteChatMessage(roomId, messageId);
  }

  addMessageReaction(roomId, messageId, userId, reaction) {
    return chatService.addMessageReaction(roomId, messageId, userId, reaction);
  }

  // Whiteboard Methods
  addWhiteboardElement(roomId, element) {
    return whiteboardService.addWhiteboardElement(roomId, element);
  }

  getWhiteboardData(roomId) {
    return whiteboardService.getWhiteboardData(roomId);
  }

  updateWhiteboardElement(roomId, elementId, updates) {
    return whiteboardService.updateWhiteboardElement(roomId, elementId, updates);
  }

  deleteWhiteboardElement(roomId, elementId) {
    return whiteboardService.deleteWhiteboardElement(roomId, elementId);
  }

  clearWhiteboard(roomId) {
    return whiteboardService.clearWhiteboard(roomId);
  }

  // Code Editor Methods
  updateRoomCode(roomId, updates) {
    return codeEditorService.updateRoomCode(roomId, updates);
  }

  getRoomCode(roomId) {
    return codeEditorService.getRoomCode(roomId);
  }

  undoCodeChange(roomId) {
    return codeEditorService.undoCodeChange(roomId);
  }

  /**
   * Get room statistics
   * @returns {object} - Object with room statistics
   */
  getStats() {
    const stats = {
      totalRooms: this.rooms.size,
      rooms: []
    };
    
    for (const [roomId, room] of this.rooms.entries()) {
      const participantCount = Array.from(room.values()).filter(entry => typeof entry === 'object' && entry !== null && entry.id).length;
      
      stats.rooms.push({
        roomId,
        participantCount,
        participants: Array.from(room.values())
          .filter(entry => typeof entry === 'object' && entry !== null && entry.id)
          .map(u => ({ id: u.id, name: u.name }))
      });
    }
    
    return stats;
  }
}

module.exports = new RoomService();