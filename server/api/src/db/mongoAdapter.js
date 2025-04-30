const mongoose = require('mongoose');
const DbAdapter = require('./dbAdapter');

// Load schemas
const UserSchema = require('../models/schemas/userSchema');
const RoomSchema = require('../models/schemas/roomSchema');
const FileSchema = require('../models/schemas/fileSchema');

/**
 * MongoDB implementation of the database adapter
 */
class MongoAdapter extends DbAdapter {
  constructor() {
    super();
    this.connection = null;
    this.models = {};
    this.initialized = false;
  }

  /**
   * Initialize MongoDB connection
   * @param {string} uri - MongoDB connection URI
   * @returns {Promise<void>}
   */
  async init(uri) {
    if (this.initialized) return;
    
    try {
      // Set up MongoDB connection options
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true
      };
      
      // Connect to MongoDB
      this.connection = await mongoose.connect(uri, options);
      
      // Register models
      this.models = {
        User: mongoose.model('User', UserSchema),
        Room: mongoose.model('Room', RoomSchema),
        File: mongoose.model('File', FileSchema)
      };
      
      this.initialized = true;
      console.log('MongoDB connected');
    } catch (err) {
      console.error('MongoDB connection error:', err);
      throw err;
    }
  }

  /**
   * Find a single document by criteria
   * @param {string} collection - Collection name
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Object|null>} - Found document or null
   */
  async findOne(collection, criteria) {
    this.ensureInitialized();
    const model = this.getModel(collection);
    return model.findOne(criteria).lean();
  }

  /**
   * Find a document by ID
   * @param {string} collection - Collection name
   * @param {string} id - Document ID
   * @returns {Promise<Object|null>} - Found document or null
   */
  async findById(collection, id) {
    this.ensureInitialized();
    const model = this.getModel(collection);
    return model.findById(id).lean();
  }

  /**
   * Find multiple documents
   * @param {string} collection - Collection name
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} - Array of documents
   */
  async find(collection, criteria = {}) {
    this.ensureInitialized();
    const model = this.getModel(collection);
    return model.find(criteria).lean();
  }

  /**
   * Create a new document
   * @param {string} collection - Collection name
   * @param {Object} data - Document data
   * @returns {Promise<Object>} - Created document
   */
  async create(collection, data) {
    this.ensureInitialized();
    const model = this.getModel(collection);
    const result = await model.create(data);
    return result.toObject();
  }

  /**
   * Update a document by criteria
   * @param {string} collection - Collection name
   * @param {Object} criteria - Search criteria
   * @param {Object} update - Update data
   * @param {Object} options - Update options
   * @returns {Promise<Object|null>} - Updated document or null
   */
  async findOneAndUpdate(collection, criteria, update, options = {}) {
    this.ensureInitialized();
    const model = this.getModel(collection);
    
    // Set default options for MongoDB
    const mongoOptions = {
      new: true,
      ...options
    };
    
    return model.findOneAndUpdate(criteria, update, mongoOptions).lean();
  }

  /**
   * Delete a document by criteria
   * @param {string} collection - Collection name
   * @param {Object} criteria - Search criteria
   * @returns {Promise<boolean>} - Success status
   */
  async remove(collection, criteria) {
    this.ensureInitialized();
    const model = this.getModel(collection);
    const result = await model.deleteOne(criteria);
    return result.deletedCount > 0;
  }

  /**
   * Disconnect from MongoDB
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect();
      this.connection = null;
      this.initialized = false;
      console.log('MongoDB disconnected');
    }
  }

  /**
   * Get a model by collection name
   * @param {string} collection - Collection name
   * @returns {Object} - Mongoose model
   * @throws {Error} - If collection doesn't exist
   */
  getModel(collection) {
    const model = this.models[collection];
    if (!model) {
      throw new Error(`Collection ${collection} not found`);
    }
    return model;
  }

  /**
   * Ensure the adapter is initialized
   * @throws {Error} - If adapter is not initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('MongoDB adapter not initialized. Call init() first.');
    }
  }
}

module.exports = MongoAdapter;