const logger = require('../utils/logger');

/**
 * CodeEditorService - Manages code editor content within rooms
 */
class CodeEditorService {
  constructor() {
    // Map of room code editor data
    this.codeEditorData = new Map();
    logger.info('CodeEditorService initialized');
  }

  /**
   * Update code editor content for a room
   * @param {string} roomId - The room identifier
   * @param {object} updates - Code updates (content and/or language)
   * @returns {boolean} - Success indicator
   */
  updateRoomCode(roomId, updates) {
    try {
      let editorData = this.codeEditorData.get(roomId);
      
      if (!editorData) {
        // Initialize default editor data
        editorData = {
          content: updates.content || '',
          language: updates.language || 'javascript',
          lastUpdated: Date.now(),
          history: []
        };
      } else {
        // Store current state in history before updating
        if (updates.content !== undefined && updates.content !== editorData.content) {
          // Only store up to 10 history items to prevent memory bloat
          if (editorData.history.length >= 10) {
            editorData.history.shift(); // Remove oldest history item
          }
          
          // Add current state to history
          editorData.history.push({
            content: editorData.content,
            language: editorData.language,
            timestamp: editorData.lastUpdated
          });
        }
        
        // Update with new values
        if (updates.content !== undefined) {
          editorData.content = updates.content;
        }
        
        if (updates.language !== undefined) {
          editorData.language = updates.language;
        }
      }
      
      // Update timestamp
      editorData.lastUpdated = Date.now();
      
      // Save updated data
      this.codeEditorData.set(roomId, editorData);
      
      logger.debug(`Updated code editor content for room ${roomId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to update code editor for room ${roomId}`, { error: error.message, roomId });
      return false;
    }
  }

  /**
   * Get the code editor content for a room
   * @param {string} roomId - The room identifier
   * @returns {object} - Code editor data including content and language
   */
  getRoomCode(roomId) {
    const editorData = this.codeEditorData.get(roomId);
    
    if (!editorData) {
      return {
        content: '',
        language: 'javascript'
      };
    }
    
    return {
      content: editorData.content,
      language: editorData.language
    };
  }

  /**
   * Undo last code change in a room
   * @param {string} roomId - The room identifier
   * @returns {object|null} - Previous state or null if no history
   */
  undoCodeChange(roomId) {
    try {
      const editorData = this.codeEditorData.get(roomId);
      
      if (!editorData || !editorData.history || editorData.history.length === 0) {
        return null;
      }
      
      // Get the last history item
      const previousState = editorData.history.pop();
      
      // Restore previous state
      const currentState = {
        content: editorData.content,
        language: editorData.language
      };
      
      editorData.content = previousState.content;
      editorData.language = previousState.language;
      editorData.lastUpdated = Date.now();
      
      // Save updated data
      this.codeEditorData.set(roomId, editorData);
      
      logger.debug(`Undid code change for room ${roomId}`);
      return currentState;
    } catch (error) {
      logger.error(`Failed to undo code change for room ${roomId}`, { error: error.message, roomId });
      return null;
    }
  }

  /**
   * Clean up code editor data for deleted rooms
   * @param {string} roomId - Room identifier
   */
  cleanupCodeEditorData(roomId) {
    if (this.codeEditorData.has(roomId)) {
      this.codeEditorData.delete(roomId);
      logger.debug(`Cleaned up code editor data for room ${roomId}`);
    }
  }
}

module.exports = new CodeEditorService();