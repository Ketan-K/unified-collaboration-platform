const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const config = {
  // Server settings
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database settings
  db: {
    useLocalDb: process.env.USE_LOCAL_DB === 'true',
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/unified-collaboration',
    localDataPath: process.env.LOCAL_DATA_PATH || './data/local'
  },
  
  // CORS settings
  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  },
  
  // JWT settings
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  },
  
  // API URLs
  urls: {
    api: process.env.API_URL || 'http://localhost:5000',
    web: process.env.WEB_URL || 'http://localhost:3000',
    admin: process.env.ADMIN_URL || 'http://localhost:4200'
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

// Validate critical configuration
function validateConfig() {
  const missingVars = [];
  
  if (config.nodeEnv === 'production') {
    if (!process.env.JWT_SECRET) missingVars.push('JWT_SECRET');
    if (!config.db.useLocalDb && !process.env.MONGO_URI) missingVars.push('MONGO_URI');
  }
  
  if (missingVars.length > 0) {
    console.warn(`⚠️  Missing critical environment variables: ${missingVars.join(', ')}`);
    if (config.nodeEnv === 'production') {
      throw new Error('Missing required environment variables for production');
    }
  }
}

// Run validation
validateConfig();

module.exports = config;