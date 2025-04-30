const logger = require('../utils/logger');
const roomService = require('../services/RoomService');

/**
 * Register media-related event handlers for audio/video
 * @param {object} io - Socket.IO server instance
 * @param {object} socket - Socket connection
 */
function register(io, socket) {
  /**
   * Handle media stream toggle (mute/unmute audio, enable/disable video)
   */
  socket.on('media-toggle', ({ roomId, userId, mediaType, enabled }) => {
    try {
      logger.debug(`User ${userId} toggled ${mediaType} to ${enabled ? 'on' : 'off'}`, {
        socketId: socket.id,
        roomId,
        userId,
        mediaType,
        enabled
      });
      
      // Update user's media state in room
      roomService.updateParticipantMedia(roomId, userId, mediaType, enabled);
      
      // Broadcast media state change to all users in room
      socket.to(roomId).emit('user-media-update', {
        userId,
        mediaType,
        enabled,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error(`Error handling media toggle`, {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId,
        mediaType
      });
    }
  });

  /**
   * Handle screen sharing start
   */
  socket.on('screen-share-start', ({ roomId, userId }) => {
    try {
      logger.debug(`User ${userId} started screen sharing`, {
        socketId: socket.id,
        roomId,
        userId
      });
      
      // Update user's screen sharing status in room
      roomService.updateParticipantScreenShare(roomId, userId, true);
      
      // Broadcast screen share start to all users in room
      socket.to(roomId).emit('user-screen-share-started', {
        userId,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Error handling screen share start', {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId
      });
      
      socket.emit('media-error', {
        error: 'Failed to start screen sharing',
        details: error.message
      });
    }
  });
  
  /**
   * Handle screen sharing stop
   */
  socket.on('screen-share-stop', ({ roomId, userId }) => {
    try {
      logger.debug(`User ${userId} stopped screen sharing`, {
        socketId: socket.id,
        roomId,
        userId
      });
      
      // Update user's screen sharing status in room
      roomService.updateParticipantScreenShare(roomId, userId, false);
      
      // Broadcast screen share stop to all users in room
      socket.to(roomId).emit('user-screen-share-stopped', {
        userId,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Error handling screen share stop', {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId
      });
    }
  });
  
  /**
   * Handle active speaker updates
   */
  socket.on('active-speaker', ({ roomId, userId, speaking }) => {
    try {
      // Broadcast active speaker update to all users in room
      socket.to(roomId).emit('user-speaking-update', {
        userId,
        speaking,
        timestamp: Date.now()
      });
    } catch (error) {
      // Silent fail for non-critical feature
      logger.debug('Error handling active speaker update', {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId
      });
    }
  });
  
  /**
   * Handle video quality change request
   */
  socket.on('video-quality-change', ({ roomId, userId, quality }) => {
    try {
      logger.debug(`User ${userId} changed video quality to ${quality}`, {
        socketId: socket.id,
        roomId,
        userId,
        quality
      });
      
      // Update user's video quality preference in room
      roomService.updateParticipantVideoQuality(roomId, userId, quality);
      
      // No need to broadcast - this is a user preference
    } catch (error) {
      logger.error('Error handling video quality change', {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId,
        quality
      });
    }
  });
  
  /**
   * Handle background blur toggle
   */
  socket.on('background-blur-toggle', ({ roomId, userId, enabled }) => {
    try {
      logger.debug(`User ${userId} toggled background blur to ${enabled ? 'on' : 'off'}`, {
        socketId: socket.id,
        roomId,
        userId,
        enabled
      });
      
      // Update user's background blur setting in room
      roomService.updateParticipantBackgroundBlur(roomId, userId, enabled);
      
      // Notify other users of the background change
      socket.to(roomId).emit('user-background-change', {
        userId,
        blurEnabled: enabled,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Error handling background blur toggle', {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId
      });
    }
  });
  
  /**
   * Handle virtual background change
   */
  socket.on('virtual-background-change', ({ roomId, userId, backgroundId }) => {
    try {
      logger.debug(`User ${userId} changed virtual background to ${backgroundId || 'none'}`, {
        socketId: socket.id,
        roomId,
        userId,
        backgroundId
      });
      
      // Update user's virtual background in room
      roomService.updateParticipantVirtualBackground(roomId, userId, backgroundId);
      
      // Notify other users of the background change
      socket.to(roomId).emit('user-background-change', {
        userId,
        virtualBackground: backgroundId,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Error handling virtual background change', {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId
      });
    }
  });
  
  /**
   * Handle audio device change
   */
  socket.on('audio-device-change', ({ roomId, userId, deviceId }) => {
    try {
      logger.debug(`User ${userId} changed audio device`, {
        socketId: socket.id,
        roomId,
        userId
      });
      
      // Update user's audio device preference in room
      roomService.updateParticipantAudioDevice(roomId, userId, deviceId);
      
      // No need to broadcast - this is a user preference
    } catch (error) {
      logger.error('Error handling audio device change', {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId
      });
    }
  });
  
  /**
   * Handle video device change
   */
  socket.on('video-device-change', ({ roomId, userId, deviceId }) => {
    try {
      logger.debug(`User ${userId} changed video device`, {
        socketId: socket.id,
        roomId,
        userId
      });
      
      // Update user's video device preference in room
      roomService.updateParticipantVideoDevice(roomId, userId, deviceId);
      
      // No need to broadcast - this is a user preference
    } catch (error) {
      logger.error('Error handling video device change', {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId
      });
    }
  });
  
  /**
   * Handle audio levels for visualization (volume indicators)
   */
  socket.on('audio-level', ({ roomId, userId, level }) => {
    try {
      // Only forward to other clients, no need to store
      socket.to(roomId).emit('user-audio-level', {
        userId,
        level,
        timestamp: Date.now()
      });
    } catch (error) {
      // Silent fail for high-frequency non-critical event
    }
  });
  
  /**
   * Handle recording toggle
   */
  socket.on('recording-toggle', ({ roomId, userId, recording }) => {
    try {
      if (recording) {
        logger.info(`User ${userId} started recording in room ${roomId}`, {
          socketId: socket.id,
          roomId,
          userId
        });
        
        // Update room recording state
        roomService.updateRoomRecordingStatus(roomId, true, userId);
      } else {
        logger.info(`User ${userId} stopped recording in room ${roomId}`, {
          socketId: socket.id,
          roomId,
          userId
        });
        
        // Update room recording state
        roomService.updateRoomRecordingStatus(roomId, false, userId);
      }
      
      // Broadcast recording state to all users in room
      io.to(roomId).emit('recording-status-change', {
        recording,
        changedBy: userId,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Error handling recording toggle', {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId
      });
      
      socket.emit('media-error', {
        error: 'Failed to change recording status',
        details: error.message
      });
    }
  });
  
  /**
   * WebRTC Signaling - Handle SDP Offer
   * When a user wants to establish a connection with another user
   */
  socket.on('webrtc:offer', ({ to, offer }) => {
    try {
      logger.debug(`Relaying WebRTC offer to ${to}`, {
        socketId: socket.id,
        to,
        offerType: offer.type
      });
      
      // Get the socket ID for the recipient
      const recipientSocketId = roomService.getSocketIdFromUserId(to);
      
      if (recipientSocketId) {
        // Relay the offer to the intended recipient with the sender's user ID
        io.to(recipientSocketId).emit('webrtc:offer', {
          from: socket.data.userId,
          offer
        });
      } else {
        logger.warn(`Cannot relay offer: User ${to} not found`, {
          socketId: socket.id,
          to
        });
        
        socket.emit('webrtc:error', {
          message: `User ${to} not found or not connected`,
          code: 'USER_NOT_FOUND'
        });
      }
    } catch (error) {
      logger.error('Error handling WebRTC offer', {
        error: error.message,
        socketId: socket.id,
        to
      });
      
      socket.emit('webrtc:error', {
        message: 'Failed to relay offer',
        code: 'RELAY_ERROR',
        details: error.message
      });
    }
  });
  
  /**
   * WebRTC Signaling - Handle SDP Answer
   * When a user responds to an offer from another user
   */
  socket.on('webrtc:answer', ({ to, answer }) => {
    try {
      logger.debug(`Relaying WebRTC answer to ${to}`, {
        socketId: socket.id,
        to,
        answerType: answer.type
      });
      
      // Get the socket ID for the recipient
      const recipientSocketId = roomService.getSocketIdFromUserId(to);
      
      if (recipientSocketId) {
        // Relay the answer to the intended recipient with the sender's user ID
        io.to(recipientSocketId).emit('webrtc:answer', {
          from: socket.data.userId,
          answer
        });
      } else {
        logger.warn(`Cannot relay answer: User ${to} not found`, {
          socketId: socket.id,
          to
        });
      }
    } catch (error) {
      logger.error('Error handling WebRTC answer', {
        error: error.message,
        socketId: socket.id,
        to
      });
    }
  });
  
  /**
   * WebRTC Signaling - Handle ICE Candidate
   * When a user discovers a new way to connect (ICE candidate)
   */
  socket.on('webrtc:ice-candidate', ({ to, candidate }) => {
    try {
      logger.debug(`Relaying ICE candidate to ${to}`, {
        socketId: socket.id,
        to
      });
      
      // Get the socket ID for the recipient
      const recipientSocketId = roomService.getSocketIdFromUserId(to);
      
      if (recipientSocketId) {
        // Relay the ICE candidate to the intended recipient with the sender's user ID
        io.to(recipientSocketId).emit('webrtc:ice-candidate', {
          from: socket.data.userId,
          candidate
        });
      }
    } catch (error) {
      logger.error('Error handling ICE candidate', {
        error: error.message,
        socketId: socket.id,
        to
      });
    }
  });
  
  /**
   * WebRTC Signaling - Connection failed or closed
   * When a peer connection fails or is closed deliberately
   */
  socket.on('webrtc:connection-state', ({ peerId, state }) => {
    try {
      logger.debug(`WebRTC connection state update with ${peerId}: ${state}`, {
        socketId: socket.id,
        peerId,
        state
      });
      
      // If connection failed, notify the other peer
      if (state === 'failed' || state === 'closed') {
        const peerSocketId = roomService.getSocketIdFromUserId(peerId);
        
        if (peerSocketId) {
          io.to(peerSocketId).emit('webrtc:peer-disconnected', {
            from: socket.data.userId
          });
        }
      }
    } catch (error) {
      logger.error('Error handling WebRTC connection state update', {
        error: error.message,
        socketId: socket.id,
        peerId,
        state
      });
    }
  });
  
  /**
   * WebRTC Signaling - Media stream renegotiation
   * When media parameters need to be renegotiated
   */
  socket.on('webrtc:renegotiate', ({ to }) => {
    try {
      logger.debug(`Media renegotiation requested with ${to}`, {
        socketId: socket.id,
        to
      });
      
      // Get the socket ID for the recipient
      const recipientSocketId = roomService.getSocketIdFromUserId(to);
      
      if (recipientSocketId) {
        // Notify the peer about renegotiation request
        io.to(recipientSocketId).emit('webrtc:renegotiate-request', {
          from: socket.data.userId
        });
      }
    } catch (error) {
      logger.error('Error handling renegotiation request', {
        error: error.message,
        socketId: socket.id,
        to
      });
    }
  });
}

module.exports = { register };