const dbManager = require('../db/dbManager');

/**
 * File model wrapper for database operations
 */
class File {
  /**
   * Find file by ID
   * @param {string} id - File ID
   * @returns {Promise<Object|null>} - File object
   */
  static async findById(id) {
    return dbManager.findById('File', id);
  }

  /**
   * Find file by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Object|null>} - File object
   */
  static async findOne(criteria) {
    return dbManager.findOne('File', criteria);
  }

  /**
   * Find multiple files
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} - Array of file objects
   */
  static async find(criteria = {}) {
    return dbManager.find('File', criteria);
  }

  /**
   * Create a new file
   * @param {Object} fileData - File data
   * @returns {Promise<Object>} - Created file object
   */
  static async create(fileData) {
    return dbManager.create('File', fileData);
  }

  /**
   * Update a file
   * @param {Object} criteria - Search criteria
   * @param {Object} update - Update data
   * @param {Object} options - Update options
   * @returns {Promise<Object|null>} - Updated file object
   */
  static async findOneAndUpdate(criteria, update, options = {}) {
    return dbManager.findOneAndUpdate('File', criteria, update, options);
  }

  /**
   * Delete a file
   * @param {Object} criteria - Search criteria
   * @returns {Promise<boolean>} - Success status
   */
  static async remove(criteria) {
    return dbManager.remove('File', criteria);
  }
}

module.exports = File;