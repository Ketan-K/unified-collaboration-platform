const dbManager = require('../db/dbManager');

/**
 * Room model wrapper for database operations
 */
class Room {
  /**
   * Find room by ID
   * @param {string} id - Room ID
   * @returns {Promise<Object|null>} - Room object
   */
  static async findById(id) {
    return dbManager.findById('Room', id);
  }

  /**
   * Find room by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Object|null>} - Room object
   */
  static async findOne(criteria) {
    return dbManager.findOne('Room', criteria);
  }

  /**
   * Find multiple rooms
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} - Array of room objects
   */
  static async find(criteria = {}) {
    return dbManager.find('Room', criteria);
  }

  /**
   * Create a new room
   * @param {Object} roomData - Room data
   * @returns {Promise<Object>} - Created room object
   */
  static async create(roomData) {
    return dbManager.create('Room', roomData);
  }

  /**
   * Update a room
   * @param {Object} criteria - Search criteria
   * @param {Object} update - Update data
   * @param {Object} options - Update options
   * @returns {Promise<Object|null>} - Updated room object
   */
  static async findOneAndUpdate(criteria, update, options = {}) {
    return dbManager.findOneAndUpdate('Room', criteria, update, options);
  }

  /**
   * Delete a room
   * @param {Object} criteria - Search criteria
   * @returns {Promise<boolean>} - Success status
   */
  static async remove(criteria) {
    return dbManager.remove('Room', criteria);
  }
}

module.exports = Room;