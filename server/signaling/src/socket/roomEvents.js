const logger = require('../utils/logger');
const roomService = require('../services/RoomService');
const fileService = require('../services/FileService');

/**
 * Register room-related event handlers for a socket
 * @param {object} io - Socket.IO server instance
 * @param {object} socket - Socket connection
 */
function register(io, socket) {
  /**
   * Handle room join event
   */
  socket.on('room:join', ({ roomId, userData }) => {
    try {
      const userId = userData?.id;
      const userName = userData?.name || 'Anonymous';
      const role = userData?.role || 'participant';
      const status = userData?.status || 'active';

      if (!roomId || !userId) {
        logger.warn('Invalid room join data', {
          socketId: socket.id,
          roomId,
          userId
        });

        socket.emit('join-failed', {
          error: 'Invalid room join data'
        });
        return;
      }

      logger.info(`User ${userName} (${userId}) joining room ${roomId}`, {
        socketId: socket.id,
        roomId,
        userId,
        role
      });

      // Join Socket.IO room
      socket.join(roomId);
      
      // Store room on socket for easier reference
      socket.roomId = roomId;
      socket.userId = userId;
      socket.userName = userName;
      
      // Store user data in socket.data for WebRTC signaling
      socket.data.userId = userId;
      
      // Add user to room service with enhanced user data
      const enhancedUserData = {
        id: userId,
        name: userName,
        socketId: socket.id,
        isAudioEnabled: userData?.isAudioEnabled ?? true,
        isVideoEnabled: userData?.isVideoEnabled ?? true,
        isScreenSharing: userData?.isScreenSharing ?? false,
        role: role,
        status: status,
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      };
      
      roomService.addUserToRoom(roomId, userId, enhancedUserData);
      
      // Notify others in the room with enhanced user data
      socket.to(roomId).emit('room:user-joined', {
        userId,
        userData: enhancedUserData
      });
      
      // Send current participants to the new user
      const participants = roomService.getRoomParticipants(roomId);
      io.to(socket.id).emit('room:users', {
        users: participants
      });
      
      // Send available files in room
      const roomFiles = fileService.getRoomFiles(roomId);
      if (roomFiles.length > 0) {
        io.to(socket.id).emit('available-files', roomFiles);
      }
      
      logger.info(`User ${userName} (${userId}) joined room ${roomId} successfully`, {
        socketId: socket.id,
        roomId,
        userId,
        role,
        participantCount: participants.length
      });
    } catch (error) {
      logger.error(`Error joining room ${roomId}`, {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId: userData?.id
      });
      
      // Send error to client
      socket.emit('error', {
        type: 'join-room-error',
        message: 'Failed to join the room',
        details: error.message
      });
    }
  });

  /**
   * Handle explicit room leave event (user clicked Leave button)
   */
  socket.on('leave-room', ({ roomId, userId }) => {
    try {
      // Remove from room service
      const user = roomService.removeUserFromRoom(roomId, userId);
      
      if (!user) {
        logger.warn(`User ${userId} tried to leave room ${roomId} but was not found`, {
          socketId: socket.id,
          roomId,
          userId
        });
        return;
      }
      
      // Leave Socket.IO room
      socket.leave(roomId);
      
      // Remove room reference from socket
      socket.roomId = undefined;
      socket.userId = undefined;
      
      // Notify others in the room
      socket.to(roomId).emit('user-left', { userId });
      
      logger.info(`User ${user.name} (${userId}) left room ${roomId}`, {
        socketId: socket.id,
        roomId,
        userId
      });
    } catch (error) {
      logger.error(`Error leaving room ${roomId}`, {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId
      });
    }
  });

  /**
   * Handle user status change
   */
  socket.on('status-change', ({ roomId, userId, status }) => {
    try {
      if (!roomId || !userId || !status) {
        logger.warn('Invalid status change request', {
          socketId: socket.id,
          roomId,
          userId,
          status
        });
        return;
      }
      
      const updates = { status };
      roomService.updateUserData(roomId, userId, updates);
      
      // Notify others in the room
      io.to(roomId).emit('user-updated', { userId, updates });
      
      logger.info(`User ${userId} changed status to ${status} in room ${roomId}`, {
        socketId: socket.id,
        roomId,
        userId
      });
    } catch (error) {
      logger.error(`Error updating user status`, {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId
      });
    }
  });
  
  /**
   * Handle user role change (only hosts can change roles)
   */
  socket.on('role-change', ({ roomId, userId, targetUserId, newRole }) => {
    try {
      if (!roomId || !userId || !targetUserId || !newRole) {
        logger.warn('Invalid role change request', {
          socketId: socket.id,
          roomId,
          userId,
          targetUserId,
          newRole
        });
        return;
      }
      
      // Check if the requesting user is a host
      const user = roomService.getUserInRoom(roomId, userId);
      if (!user || user.role !== 'host') {
        logger.warn(`User ${userId} attempted to change roles without host privileges`, {
          socketId: socket.id,
          roomId,
          userId,
          targetUserId,
          newRole
        });
        
        socket.emit('error', {
          type: 'permission-error',
          message: 'You do not have permission to change user roles'
        });
        return;
      }
      
      const updates = { role: newRole };
      roomService.updateUserData(roomId, targetUserId, updates);
      
      // Notify everyone in the room
      io.to(roomId).emit('user-updated', { userId: targetUserId, updates });
      
      logger.info(`User ${targetUserId} role changed to ${newRole} by ${userId} in room ${roomId}`, {
        socketId: socket.id,
        roomId,
        userId,
        targetUserId,
        newRole
      });
    } catch (error) {
      logger.error(`Error updating user role`, {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId,
        targetUserId
      });
    }
  });

  /**
   * Handle room activity ping/heartbeat
   */
  socket.on('room-activity', ({ roomId, userId }) => {
    try {
      // Update last activity timestamp for the user
      if (roomId && userId) {
        const updates = { lastActive: new Date().toISOString() };
        roomService.updateUserData(roomId, userId, updates);
      }
    } catch (error) {
      logger.error(`Error updating room activity`, {
        error: error.message,
        socketId: socket.id,
        roomId,
        userId
      });
    }
  });
}

module.exports = { register };