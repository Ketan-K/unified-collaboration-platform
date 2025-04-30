const logger = require('../utils/logger');
const roomService = require('../services/RoomService');
const roomEvents = require('./roomEvents');
const chatEvents = require('./chatEvents');
const fileEvents = require('./fileEvents');
const mediaEvents = require('./mediaEvents');
const signalingEvents = require('./signalingEvents');
const webrtcEvents = require('./webrtcEvents');
const whiteboardEvents = require('./whiteboardEvents');
const codeEditorEvents = require('./codeEditorEvents');

/**
 * Initialize and configure socket.io event handlers
 * @param {object} io - Socket.IO server instance
 */
function initialize(io) {
  logger.info('Initializing socket.io handlers');

  // Set up connection event handler
  io.on('connection', (socket) => {
    logger.info(`New socket connection: ${socket.id}`);
    
    // Store user data in socket object for use in socketHandler.js
    socket.data = {};
    
    // Register all event handlers
    registerEventHandlers(io, socket);
    
    // Handle disconnection
    handleDisconnection(io, socket);
  });
}

/**
 * Register all socket event handlers
 * @param {object} io - Socket.IO server instance
 * @param {object} socket - Socket connection
 */
function registerEventHandlers(io, socket) {
  // Register each module's event handlers
  roomEvents.register(io, socket);
  chatEvents.register(io, socket);
  fileEvents.register(io, socket);
  mediaEvents.register(io, socket);
  signalingEvents.register(io, socket);
  webrtcEvents(socket, io); // WebRTC events have different signature
  whiteboardEvents.register(io, socket);
  codeEditorEvents.register(io, socket);
  
  // Handle ping/pong for connection health monitoring
  socket.on('ping', (callback) => {
    if (typeof callback === 'function') {
      callback({
        timestamp: Date.now()
      });
    }
  });
}

/**
 * Handle socket disconnection
 * @param {object} io - Socket.IO server instance
 * @param {object} socket - Socket connection
 */
function handleDisconnection(io, socket) {
  socket.on('disconnect', () => {
    const { roomId, userId, userName } = socket;
    
    if (roomId && userId) {
      // Remove user from room in our service
      roomService.removeUserFromRoom(roomId, userId);
      
      logger.info(`User ${userName || userId} disconnected from room ${roomId}`, {
        roomId,
        userId,
        socketId: socket.id
      });
      
      // Notify other room participants
      socket.to(roomId).emit('user-left', {
        id: userId,
        timestamp: new Date().toISOString()
      });
    } else {
      logger.debug(`Socket disconnected without known room/user: ${socket.id}`);
    }
  });
}

module.exports = {
  initialize
};