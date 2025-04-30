const logger = require('../utils/logger');

/**
 * WhiteboardService - Manages whiteboard data within rooms
 */
class WhiteboardService {
  constructor() {
    // Store whiteboard data for rooms
    this.whiteboardData = new Map();
    logger.info('WhiteboardService initialized');
  }

  /**
   * Add a whiteboard element to a room
   * @param {string} roomId - The room identifier
   * @param {object} element - The whiteboard element
   * @returns {boolean} - Success indicator
   */
  addWhiteboardElement(roomId, element) {
    try {
      if (!this.whiteboardData.has(roomId)) {
        this.whiteboardData.set(roomId, []);
      }
      
      this.whiteboardData.get(roomId).push(element);
      
      logger.debug(`Added whiteboard element to room ${roomId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to add whiteboard element to room ${roomId}`, { error: error.message, roomId });
      return false;
    }
  }

  /**
   * Get all whiteboard elements for a room
   * @param {string} roomId - The room identifier
   * @returns {Array} - Array of whiteboard elements
   */
  getWhiteboardData(roomId) {
    return this.whiteboardData.get(roomId) || [];
  }

  /**
   * Update a specific whiteboard element
   * @param {string} roomId - The room identifier
   * @param {string} elementId - The element identifier
   * @param {object} updates - Updates to apply to the element
   * @returns {boolean} - Success indicator
   */
  updateWhiteboardElement(roomId, elementId, updates) {
    try {
      if (!this.whiteboardData.has(roomId)) {
        return false;
      }
      
      const elements = this.whiteboardData.get(roomId);
      const elementIndex = elements.findIndex(el => el.id === elementId);
      
      if (elementIndex === -1) {
        return false;
      }
      
      // Update the element
      elements[elementIndex] = { ...elements[elementIndex], ...updates };
      
      logger.debug(`Updated whiteboard element ${elementId} in room ${roomId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to update whiteboard element in room ${roomId}`, { error: error.message, roomId });
      return false;
    }
  }

  /**
   * Delete a specific whiteboard element
   * @param {string} roomId - The room identifier
   * @param {string} elementId - The element identifier
   * @returns {boolean} - Success indicator
   */
  deleteWhiteboardElement(roomId, elementId) {
    try {
      if (!this.whiteboardData.has(roomId)) {
        return false;
      }
      
      const elements = this.whiteboardData.get(roomId);
      const initialLength = elements.length;
      
      // Filter out the element to delete
      const filteredElements = elements.filter(el => el.id !== elementId);
      
      if (filteredElements.length === initialLength) {
        // Element wasn't found
        return false;
      }
      
      this.whiteboardData.set(roomId, filteredElements);
      
      logger.debug(`Deleted whiteboard element ${elementId} from room ${roomId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete whiteboard element from room ${roomId}`, { error: error.message, roomId });
      return false;
    }
  }

  /**
   * Clear whiteboard for a room
   * @param {string} roomId - The room identifier
   * @returns {boolean} - Success indicator
   */
  clearWhiteboard(roomId) {
    try {
      this.whiteboardData.set(roomId, []);
      
      logger.debug(`Cleared whiteboard for room ${roomId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to clear whiteboard for room ${roomId}`, { error: error.message, roomId });
      return false;
    }
  }

  /**
   * Clean up whiteboard data for deleted rooms
   * @param {string} roomId - Room identifier
   */
  cleanupWhiteboardData(roomId) {
    if (this.whiteboardData.has(roomId)) {
      this.whiteboardData.delete(roomId);
      logger.debug(`Cleaned up whiteboard data for room ${roomId}`);
    }
  }
}

module.exports = new WhiteboardService();