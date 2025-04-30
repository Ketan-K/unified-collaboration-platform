const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Default configuration with fallback values
const config = {
  // Server settings
  server: {
    port: parseInt(process.env.PORT || '4000', 10),
    env: process.env.NODE_ENV || 'development',
  },
  
  // CORS settings
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  
  // Socket.IO settings
  socket: {
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT || '60000', 10),
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL || '25000', 10),
    path: process.env.SOCKET_PATH || '/socket.io',
  },
  
  // WebRTC ICE server configuration
  iceServers: [
    { urls: process.env.STUN_SERVER || 'stun:stun.l.google.com:19302' },
    { urls: process.env.STUN_SERVER_BACKUP || 'stun:stun1.l.google.com:19302' }
  ],
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    console: process.env.NODE_ENV !== 'production',
    file: true
  },
  
  // Session timeout (milliseconds)
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '86400000', 10) // 24 hours by default
};

// Environment-specific configurations
if (config.server.env === 'production') {
  // In production, we might want more strict settings
  if (process.env.CORS_ORIGIN === '*') {
    console.warn('Warning: CORS is set to allow all origins in production environment');
  }
}

module.exports = config;