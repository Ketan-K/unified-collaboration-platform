const MongoAdapter = require('./mongoAdapter');
const LocalAdapter = require('./localAdapter');

/**
 * Database Manager - Manages database connections and provides a single interface
 * to work with different database implementations
 */
class DbManager {
  constructor() {
    this.adapter = null;
    this.adapterType = null;
  }

  /**
   * Initialize the database with the specified adapter type
   * @param {string} adapterType - The adapter type ('mongo' or 'local')
   * @param {Object} options - Options for the adapter initialization
   * @returns {Promise<void>}
   */
  async init(adapterType = 'mongo', options = {}) {
    if (this.adapter) {
      await this.disconnect();
    }

    if (adapterType === 'mongo') {
      this.adapter = new MongoAdapter();
      await this.adapter.init(options.uri || process.env.MONGODB_URI);
    } else if (adapterType === 'local') {
      this.adapter = new LocalAdapter();
      await this.adapter.init();
    } else {
      throw new Error(`Unsupported adapter type: ${adapterType}`);
    }

    this.adapterType = adapterType;
    console.log(`Database initialized with ${adapterType} adapter`);
  }

  /**
   * Get the current adapter
   * @returns {Object} - Current database adapter
   * @throws {Error} - If adapter is not initialized
   */
  getAdapter() {
    if (!this.adapter) {
      throw new Error('Database adapter not initialized. Call init() first.');
    }
    return this.adapter;
  }

  /**
   * Find a single document by criteria
   * @param {string} collection - Collection/model name
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Object|null>} - Found document or null
   */
  async findOne(collection, criteria) {
    return this.getAdapter().findOne(collection, criteria);
  }

  /**
   * Find a document by ID
   * @param {string} collection - Collection/model name
   * @param {string} id - Document ID
   * @returns {Promise<Object|null>} - Found document or null
   */
  async findById(collection, id) {
    return this.getAdapter().findById(collection, id);
  }

  /**
   * Find multiple documents
   * @param {string} collection - Collection/model name
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} - Array of documents
   */
  async find(collection, criteria = {}) {
    return this.getAdapter().find(collection, criteria);
  }

  /**
   * Create a new document
   * @param {string} collection - Collection/model name
   * @param {Object} data - Document data
   * @returns {Promise<Object>} - Created document
   */
  async create(collection, data) {
    return this.getAdapter().create(collection, data);
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
    return this.getAdapter().findOneAndUpdate(collection, criteria, update, options);
  }

  /**
   * Delete a document by criteria
   * @param {string} collection - Collection/model name
   * @param {Object} criteria - Search criteria
   * @returns {Promise<boolean>} - Success status
   */
  async remove(collection, criteria) {
    return this.getAdapter().remove(collection, criteria);
  }

  /**
   * Disconnect from the database
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.adapter) {
      if (typeof this.adapter.disconnect === 'function') {
        await this.adapter.disconnect();
      }
      this.adapter = null;
      this.adapterType = null;
    }
  }
}

// Create a singleton instance
const dbManager = new DbManager();

module.exports = dbManager;