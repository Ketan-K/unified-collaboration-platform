/**
 * Abstract database adapter class that defines the interface
 * that all database implementations must follow
 */
class DbAdapter {
  /**
   * Initialize the database adapter
   * @param {Object} options - Adapter-specific initialization options
   * @returns {Promise<void>}
   */
  async init(options) {
    throw new Error('Method not implemented');
  }

  /**
   * Find a single document by criteria
   * @param {string} collection - Collection/model name
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Object|null>} - Found document or null
   */
  async findOne(collection, criteria) {
    throw new Error('Method not implemented');
  }

  /**
   * Find a document by ID
   * @param {string} collection - Collection/model name
   * @param {string} id - Document ID
   * @returns {Promise<Object|null>} - Found document or null
   */
  async findById(collection, id) {
    throw new Error('Method not implemented');
  }

  /**
   * Find multiple documents
   * @param {string} collection - Collection/model name
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} - Array of documents
   */
  async find(collection, criteria) {
    throw new Error('Method not implemented');
  }

  /**
   * Create a new document
   * @param {string} collection - Collection/model name
   * @param {Object} data - Document data
   * @returns {Promise<Object>} - Created document
   */
  async create(collection, data) {
    throw new Error('Method not implemented');
  }

  /**
   * Update a document by criteria
   * @param {string} collection - Collection/model name
   * @param {Object} criteria - Search criteria
   * @param {Object} update - Update data
   * @param {Object} options - Update options
   * @returns {Promise<Object|null>} - Updated document or null
   */
  async findOneAndUpdate(collection, criteria, update, options = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Delete a document by criteria
   * @param {string} collection - Collection/model name
   * @param {Object} criteria - Search criteria
   * @returns {Promise<boolean>} - Success status
   */
  async remove(collection, criteria) {
    throw new Error('Method not implemented');
  }

  /**
   * Disconnect from the database
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('Method not implemented');
  }
}

module.exports = DbAdapter;