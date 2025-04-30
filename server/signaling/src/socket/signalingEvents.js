const logger = require('../utils/logger');
const roomService = require('../services/RoomService');

/**
 * Register WebRTC signaling event handlers
 * @param {object} io - Socket.IO server instance
 * @param {object} socket - Socket connection
 */
function register(io, socket) {
  /**
   * Handle WebRTC offer
   */
  socket.on('offer', ({ offer, to, from }) => {
    try {
      // Validate inputs
      if (!offer || !to || !from) {
        logger.warn('Invalid offer data received', {
          socketId: socket.id,
          from,
          to
        });
        return;
      }
      
      // Get recipient's socket ID
      const recipient = roomService.getRoomParticipant(socket.roomId, to);
      
      if (!recipient || !recipient.socketId) {
        logger.warn(`Cannot find recipient for offer`, {
          socketId: socket.id,
          from,
          to,
          roomId: socket.roomId
        });
        return;
      }
      
      logger.debug(`Forwarding offer from ${from} to ${to}`, {
        socketId: socket.id,
        from,
        to,
        roomId: socket.roomId
      });
      
      // Forward the offer to the recipient
      io.to(recipient.socketId).emit('offer', { offer, from });
    } catch (error) {
      logger.error('Error handling WebRTC offer', {
        error: error.message,
        socketId: socket.id,
        from,
        to
      });
    }
  });
  
  /**
   * Handle WebRTC answer
   */
  socket.on('answer', ({ answer, to, from }) => {
    try {
      // Validate inputs
      if (!answer || !to || !from) {
        logger.warn('Invalid answer data received', {
          socketId: socket.id,
          from,
          to
        });
        return;
      }
      
      // Get recipient's socket ID
      const recipient = roomService.getRoomParticipant(socket.roomId, to);
      
      if (!recipient || !recipient.socketId) {
        logger.warn(`Cannot find recipient for answer`, {
          socketId: socket.id,
          from,
          to,
          roomId: socket.roomId
        });
        return;
      }
      
      logger.debug(`Forwarding answer from ${from} to ${to}`, {
        socketId: socket.id,
        from,
        to,
        roomId: socket.roomId
      });
      
      // Forward the answer to the recipient
      io.to(recipient.socketId).emit('answer', { answer, from });
    } catch (error) {
      logger.error('Error handling WebRTC answer', {
        error: error.message,
        socketId: socket.id,
        from,
        to
      });
    }
  });
  
  /**
   * Handle ICE candidates
   */
  socket.on('ice-candidate', ({ candidate, to, from, roomId }) => {
    try {
      // Validate inputs
      if (!candidate || !to || !from) {
        logger.warn('Invalid ICE candidate data received', {
          socketId: socket.id,
          from,
          to
        });
        return;
      }
      
      // Use the roomId from the event payload if provided, otherwise fall back to socket.roomId
      const effectiveRoomId = roomId || socket.roomId;
      
      if (!effectiveRoomId) {
        logger.warn('Missing roomId for ICE candidate forwarding', {
          socketId: socket.id,
          from,
          to
        });
        return;
      }
      
      // Get recipient's socket ID
      const recipient = roomService.getRoomParticipant(effectiveRoomId, to);
      
      if (!recipient || !recipient.socketId) {
        logger.warn(`Cannot find recipient for ICE candidate`, {
          socketId: socket.id,
          from,
          to,
          roomId: effectiveRoomId
        });
        return;
      }
      
      logger.debug(`Forwarding ICE candidate from ${from} to ${to}`, {
        socketId: socket.id,
        from,
        to,
        roomId: effectiveRoomId,
        candidateType: candidate.type || 'unknown'
      });
      
      // Forward the ICE candidate to the recipient
      io.to(recipient.socketId).emit('ice-candidate', { candidate, from });
    } catch (error) {
      logger.error('Error handling ICE candidate', {
        error: error.toString(),
        stack: error.stack,
        socketId: socket.id,
        from,
        to,
        roomId: roomId || socket.roomId
      });
    }
  });
  
  /**
   * Handle connection state updates
   */
  socket.on('connection-state', ({ state, peerId, roomId, userId }) => {
    try {
      logger.debug(`Connection state update: ${state} with peer ${peerId}`, {
        socketId: socket.id,
        userId,
        peerId,
        roomId,
        state
      });
      
      // Update connection state in room service (optional)
      roomService.updatePeerConnectionState(roomId, userId, peerId, state);
    } catch (error) {
      logger.error('Error handling connection state update', {
        error: error.message,
        socketId: socket.id,
        userId,
        peerId,
        roomId
      });
    }
  });
  
  /**
   * Handle connection restart request
   */
  socket.on('restart-connection', ({ peerId, roomId, userId }) => {
    try {
      logger.info(`Connection restart requested with peer ${peerId}`, {
        socketId: socket.id,
        userId,
        peerId,
        roomId
      });
      
      // Get peer's socket ID
      const peer = roomService.getRoomParticipant(roomId, peerId);
      
      if (peer && peer.socketId) {
        // Notify the peer about restart request
        io.to(peer.socketId).emit('connection-restart-request', {
          from: userId,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      logger.error('Error handling connection restart request', {
        error: error.message,
        socketId: socket.id,
        userId,
        peerId,
        roomId
      });
    }
  });
}

module.exports = { register };