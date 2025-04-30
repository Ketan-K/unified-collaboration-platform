const dbManager = require('../db/dbManager');

/**
 * User model wrapper for database operations
 */
class User {
  /**
   * Find user by ID
   * @param {string} id - User ID
   * @returns {Promise<Object|null>} - User object
   */
  static async findById(id) {
    return dbManager.findById('User', id);
  }

  /**
   * Find user by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Object|null>} - User object
   */
  static async findOne(criteria) {
    return dbManager.findOne('User', criteria);
  }

  /**
   * Find multiple users
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} - Array of user objects
   */
  static async find(criteria = {}) {
    return dbManager.find('User', criteria);
  }

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} - Created user object
   */
  static async create(userData) {
    return dbManager.create('User', userData);
  }

  /**
   * Update a user
   * @param {Object} criteria - Search criteria
   * @param {Object} update - Update data
   * @param {Object} options - Update options
   * @returns {Promise<Object|null>} - Updated user object
   */
  static async findOneAndUpdate(criteria, update, options = {}) {
    return dbManager.findOneAndUpdate('User', criteria, update, options);
  }

  /**
   * Match password for a user instance
   * @param {string} enteredPassword - Password to check
   * @param {string} hashedPassword - Stored hashed password
   * @returns {Promise<boolean>} - Whether password matches
   */
  static async matchPassword(enteredPassword, hashedPassword) {
    // Import dynamically to avoid circular dependencies
    const bcrypt = require('bcryptjs');
    return bcrypt.compare(enteredPassword, hashedPassword);
  }
}

module.exports = User;