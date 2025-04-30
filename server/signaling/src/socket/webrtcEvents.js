/**
 * WebRTC signaling events
 */
const logger = require('../utils/logger');
const roomService = require('../services/RoomService');

/**
 * Set up WebRTC signaling events
 * @param {Object} socket - Socket.io socket instance
 * @param {Object} io - Socket.io server instance
 */
function setupWebRTCEvents(socket, io) {
  // Use socket.data.userId for the user's ID from room:join
  // This ensures we have the user ID from userData rather than the socket ID
  
  // Handle WebRTC offer
  socket.on('webrtc:offer', ({ to, offer }) => {
    const from = socket.data.userId || socket.id;
    logger.info(`WebRTC offer from ${from} to ${to}`);
    
    // Find the target socket by user ID
    const targetSocket = findSocketByUserId(io, to);
    
    if (targetSocket) {
      // Forward the offer to the target peer
      targetSocket.emit('webrtc:offer', {
        from,
        offer
      });
    } else {
      logger.warn(`Cannot forward WebRTC offer: user ${to} not found`);
    }
  });
  
  // Handle WebRTC answer
  socket.on('webrtc:answer', ({ to, answer }) => {
    const from = socket.data.userId || socket.id;
    logger.info(`WebRTC answer from ${from} to ${to}`);
    
    // Find the target socket by user ID
    const targetSocket = findSocketByUserId(io, to);
    
    if (targetSocket) {
      // Forward the answer to the target peer
      targetSocket.emit('webrtc:answer', {
        from,
        answer
      });
    } else {
      logger.warn(`Cannot forward WebRTC answer: user ${to} not found`);
    }
  });
  
  // Handle ICE candidates
  socket.on('webrtc:ice-candidate', ({ to, candidate }) => {
    const from = socket.data.userId || socket.id;
    logger.debug(`ICE candidate from ${from} to ${to}`);
    
    // Find the target socket by user ID
    const targetSocket = findSocketByUserId(io, to);
    
    if (targetSocket) {
      // Forward the ICE candidate to the target peer
      targetSocket.emit('webrtc:ice-candidate', {
        from,
        candidate
      });
    } else {
      logger.debug(`Cannot forward ICE candidate: user ${to} not found`);
    }
  });
}

/**
 * Find a socket by user ID by looking through all rooms
 * @param {Object} io - Socket.io server instance
 * @param {String} userId - User ID to find
 * @returns {Object|null} - Socket instance or null if not found
 */
function findSocketByUserId(io, userId) {
  try {
    // Get all connected sockets
    const sockets = io.sockets.sockets;
    
    // Find the socket with matching user ID
    for (const [socketId, socket] of sockets) {
      if (socket.data.userId === userId) {
        return socket;
      }
    }
    
    return null;
  } catch (error) {
    logger.error(`Error finding socket by user ID: ${error.message}`);
    return null;
  }
}

module.exports = setupWebRTCEvents;