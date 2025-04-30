const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const DbAdapter = require('./dbAdapter');
const config = require('../config/config');

/**
 * Local filesystem implementation of the database adapter using JSON files
 */
class LocalAdapter extends DbAdapter {
  constructor() {
    super();
    this.collections = {};
    this.dataDir = '';
    this.initialized = false;
  }

  /**
   * Initialize local storage
   * @param {Object} options - Configuration options
   * @param {string} options.dataPath - Path to store data files
   * @returns {Promise<void>}
   */
  async init(options = {}) {
    if (this.initialized) return;
    
    try {
      this.dataDir = options.dataPath || config.db.localDataPath;
      
      // Ensure data directory exists
      await this.ensureDirectoryExists(this.dataDir);
      
      // Initialize collections
      await this.initializeCollections(['User', 'Room', 'File']);
      
      this.initialized = true;
      console.log(`Local storage initialized at ${this.dataDir}`);
    } catch (err) {
      console.error('Local storage initialization error:', err);
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
    const items = await this.getCollection(collection);
    
    return items.find(item => this.matchesCriteria(item, criteria)) || null;
  }

  /**
   * Find a document by ID
   * @param {string} collection - Collection name
   * @param {string} id - Document ID
   * @returns {Promise<Object|null>} - Found document or null
   */
  async findById(collection, id) {
    this.ensureInitialized();
    const items = await this.getCollection(collection);
    
    // For MongoDB compatibility - handle both _id and id
    return items.find(item => 
      (item._id && (item._id.toString() === id.toString())) || 
      (item.id && (item.id.toString() === id.toString()))
    ) || null;
  }

  /**
   * Find multiple documents
   * @param {string} collection - Collection name
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} - Array of documents
   */
  async find(collection, criteria = {}) {
    this.ensureInitialized();
    const items = await this.getCollection(collection);
    
    if (Object.keys(criteria).length === 0) {
      return items;
    }
    
    return items.filter(item => this.matchesCriteria(item, criteria));
  }

  /**
   * Create a new document
   * @param {string} collection - Collection name
   * @param {Object} data - Document data
   * @returns {Promise<Object>} - Created document
   */
  async create(collection, data) {
    this.ensureInitialized();
    const items = await this.getCollection(collection);
    
    // Ensure the document has an ID
    const newItem = { ...data };
    if (!newItem._id) {
      newItem._id = uuidv4();
    }
    
    // Add timestamps
    if (!newItem.createdAt) {
      newItem.createdAt = new Date();
    }
    
    // Add to collection
    items.push(newItem);
    
    // Save to disk
    await this.saveCollection(collection, items);
    
    return { ...newItem };
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
    const items = await this.getCollection(collection);
    const index = items.findIndex(item => this.matchesCriteria(item, criteria));
    
    if (index === -1) {
      return null;
    }
    
    // Apply updates (handle $set, $push, etc.)
    const originalItem = items[index];
    const updatedItem = this.applyUpdate(originalItem, update);
    
    // Update timestamp
    updatedItem.updatedAt = new Date();
    
    // Replace in collection
    items[index] = updatedItem;
    
    // Save to disk
    await this.saveCollection(collection, items);
    
    return { ...updatedItem };
  }

  /**
   * Delete a document by criteria
   * @param {string} collection - Collection name
   * @param {Object} criteria - Search criteria
   * @returns {Promise<boolean>} - Success status
   */
  async remove(collection, criteria) {
    this.ensureInitialized();
    const items = await this.getCollection(collection);
    const originalLength = items.length;
    
    // Filter out the item to remove
    const newItems = items.filter(item => !this.matchesCriteria(item, criteria));
    
    if (newItems.length === originalLength) {
      return false;
    }
    
    // Save to disk
    await this.saveCollection(collection, newItems);
    
    return true;
  }

  /**
   * Disconnect/cleanup local storage
   * @returns {Promise<void>}
   */
  async disconnect() {
    // Nothing to disconnect for local storage
    this.initialized = false;
  }

  /**
   * Check if an item matches the criteria
   * @param {Object} item - Document to check
   * @param {Object} criteria - Search criteria
   * @returns {boolean} - Whether the item matches
   */
  matchesCriteria(item, criteria) {
    return Object.entries(criteria).every(([key, value]) => {
      // Handle special case for MongoDB ID
      if (key === '_id' && item._id) {
        return item._id.toString() === value.toString();
      }
      
      // Handle nested properties using dot notation
      if (key.includes('.')) {
        const parts = key.split('.');
        let current = item;
        for (const part of parts) {
          if (current === undefined || current === null) {
            return false;
          }
          current = current[part];
        }
        return current === value;
      }
      
      // Handle comparison objects like { $gt: 5 }
      if (value !== null && typeof value === 'object') {
        // Handle MongoDB operators
        if ('$in' in value) {
          return value.$in.includes(item[key]);
        }
        if ('$gt' in value) {
          return item[key] > value.$gt;
        }
        if ('$lt' in value) {
          return item[key] < value.$lt;
        }
        if ('$gte' in value) {
          return item[key] >= value.$gte;
        }
        if ('$lte' in value) {
          return item[key] <= value.$lte;
        }
        if ('$ne' in value) {
          return item[key] !== value.$ne;
        }
        // Deep comparison for objects
        return JSON.stringify(item[key]) === JSON.stringify(value);
      }
      
      return item[key] === value;
    });
  }

  /**
   * Apply update operations to a document
   * @param {Object} original - Original document
   * @param {Object} update - Update operations
   * @returns {Object} - Updated document
   */
  applyUpdate(original, update) {
    const result = { ...original };
    
    // Handle MongoDB-style update operators
    if (update.$set) {
      Object.entries(update.$set).forEach(([key, value]) => {
        this.setNestedValue(result, key, value);
      });
    }
    
    if (update.$push) {
      Object.entries(update.$push).forEach(([key, value]) => {
        if (!Array.isArray(result[key])) {
          result[key] = [];
        }
        result[key].push(value);
      });
    }
    
    if (update.$inc) {
      Object.entries(update.$inc).forEach(([key, value]) => {
        result[key] = (result[key] || 0) + value;
      });
    }
    
    if (update.$unset) {
      Object.keys(update.$unset).forEach(key => {
        delete result[key];
      });
    }
    
    // If there are no operators, treat it as a direct $set
    if (!update.$set && !update.$push && !update.$inc && !update.$unset) {
      Object.entries(update).forEach(([key, value]) => {
        result[key] = value;
      });
    }
    
    return result;
  }

  /**
   * Set a nested value using dot notation
   * @param {Object} obj - Object to modify
   * @param {string} path - Path using dot notation
   * @param {any} value - Value to set
   */
  setNestedValue(obj, path, value) {
    if (!path.includes('.')) {
      obj[path] = value;
      return;
    }
    
    const parts = path.split('.');
    const firstPart = parts[0];
    const restParts = parts.slice(1).join('.');
    
    if (obj[firstPart] === undefined) {
      obj[firstPart] = {};
    }
    
    this.setNestedValue(obj[firstPart], restParts, value);
  }

  /**
   * Load a collection from disk
   * @param {string} collection - Collection name
   * @returns {Promise<Array>} - Collection documents
   */
  async getCollection(collection) {
    if (!this.collections[collection]) {
      try {
        const filePath = this.getCollectionPath(collection);
        const data = await fs.readFile(filePath, 'utf8');
        this.collections[collection] = JSON.parse(data);
      } catch (err) {
        if (err.code === 'ENOENT') {
          // Collection doesn't exist yet, initialize it
          this.collections[collection] = [];
          await this.saveCollection(collection, []);
        } else {
          throw err;
        }
      }
    }
    
    return this.collections[collection];
  }

  /**
   * Save a collection to disk
   * @param {string} collection - Collection name
   * @param {Array} items - Collection documents
   * @returns {Promise<void>}
   */
  async saveCollection(collection, items) {
    const filePath = this.getCollectionPath(collection);
    this.collections[collection] = items;
    await fs.writeFile(filePath, JSON.stringify(items, null, 2), 'utf8');
  }

  /**
   * Get the file path for a collection
   * @param {string} collection - Collection name
   * @returns {string} - Absolute file path
   */
  getCollectionPath(collection) {
    return path.join(this.dataDir, `${collection.toLowerCase()}.json`);
  }

  /**
   * Initialize collections
   * @param {Array<string>} collections - List of collection names
   * @returns {Promise<void>}
   */
  async initializeCollections(collections) {
    for (const collection of collections) {
      await this.ensureCollectionExists(collection);
    }
  }

  /**
   * Ensure a collection file exists
   * @param {string} collection - Collection name
   * @returns {Promise<void>}
   */
  async ensureCollectionExists(collection) {
    const filePath = this.getCollectionPath(collection);
    try {
      await fs.access(filePath);
    } catch (err) {
      if (err.code === 'ENOENT') {
        await fs.writeFile(filePath, '[]', 'utf8');
      } else {
        throw err;
      }
    }
  }

  /**
   * Ensure a directory exists
   * @param {string} dir - Directory path
   * @returns {Promise<void>}
   */
  async ensureDirectoryExists(dir) {
    try {
      await fs.access(dir);
    } catch (err) {
      if (err.code === 'ENOENT') {
        await fs.mkdir(dir, { recursive: true });
      } else {
        throw err;
      }
    }
  }

  /**
   * Ensure the adapter is initialized
   * @throws {Error} - If adapter is not initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('Local storage adapter not initialized. Call init() first.');
    }
  }
}

module.exports = LocalAdapter;