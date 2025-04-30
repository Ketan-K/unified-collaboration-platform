import { io, Socket } from 'socket.io-client';
import { store } from '../../lib/redux/store';
import { addParticipant, removeParticipant, updateParticipant } from '../../lib/redux/slices/roomSlice';
import { setRoomData } from '../../lib/redux/slices/roomSlice';
import { addMessage } from '../../lib/redux/slices/chatSlice';
import webRTCService from './webRTCService';

/**
 * Socket service for handling communication with the signaling server
 * Abstracts WebSocket communication and provides type-safe event handlers
 */
class SocketService {
  private _socket: Socket | null = null;
  private connected = false;
  private roomId: string | null = null;
  private userId: string | null = null;
  private audioStream: MediaStream | null = null;
  private videoStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private remoteStreamHandlers: Array<(stream: MediaStream, userId: string) => void> = [];

  /**
   * Get the socket instance
   */
  get socket(): Socket | null {
    return this._socket;
  }

  /**
   * Connect to the signaling server
   * @returns Promise that resolves to true if connection is successful
   */
  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.connected && this._socket) {
        resolve(true);
        return;
      }

      const serverUrl = process.env.NEXT_PUBLIC_SIGNALING_URL || 'http://localhost:4000';
      
      this._socket = io(serverUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this._socket.on('connect', () => {
        console.log('Connected to signaling server', this._socket?.id);
        this.connected = true;
        this.setupEventListeners();
        
        // Provide the socket getter to the WebRTC service
        webRTCService.setSocketGetter(() => this._socket);
        
        resolve(true);
      });

      this._socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        this.connected = false;
        resolve(false);
      });

      this._socket.on('disconnect', (reason) => {
        console.log('Disconnected:', reason);
        this.connected = false;
      });
    });
  }

  /**
   * Join a room
   * @param roomId Room ID
   * @param userId User ID
   * @param userName User name
   */
  joinRoom(roomId: string, userId: string, userName: string): void {
    if (!this._socket || !this.connected) {
      console.error('Socket not connected');
      return;
    }

    this.roomId = roomId;
    this.userId = userId;

    // Format the event name and payload to match server expectations (room:join with userData object)
    this._socket.emit('room:join', {
      roomId,
      userData: {
        id: userId,
        name: userName,
        isAudioEnabled: false,
        isVideoEnabled: false,
        isScreenSharing: false,
        isHandRaised: false,
        timestamp: new Date().toISOString(),
      }
    });
    
    console.log(`Emitted room:join event for room: ${roomId}, user: ${userId}`);
  }

  /**
   * Leave the current room
   */
  leaveRoom(): void {
    if (!this._socket || !this.connected || !this.roomId || !this.userId) {
      console.error('Socket not connected or room/user not set');
      return;
    }

    this._socket.emit('leave-room', {
      roomId: this.roomId,
      userId: this.userId,
      timestamp: new Date().toISOString(),
    });

    this.roomId = null;
  }

  /**
   * Disconnect from the signaling server
   */
  disconnect(): void {
    if (this._socket) {
      this._socket.disconnect();
      this._socket = null;
      this.connected = false;
      this.roomId = null;
      this.userId = null;
    }
  }

  /**
   * Setup event listeners for various socket events
   */
  private setupEventListeners(): void {
    if (!this._socket) return;

    // Room events
    this._socket.on('room-data', (data) => {
      store.dispatch(setRoomData(data));
    });

    // Listen for room:user-joined - matches server's event name
    this._socket.on('room:user-joined', (data) => {
      console.log('User joined room:', data);
      const participant = data.userData || data;
      store.dispatch(addParticipant(participant));
      
      // Notify WebRTC service about the new participant
      if (this.userId && participant.id !== this.userId) {
        webRTCService.initiateConnection(participant.id);
      }
    });

    this._socket.on('room:users', (data) => {
      console.log('Received room users list:', data);
      if (data.users && Array.isArray(data.users)) {
        data.users.forEach(user => {
          if (user.id !== this.userId) {
            store.dispatch(addParticipant(user));
          }
        });
      }
    });

    // User left event
    this._socket.on('user-left', (data) => {
      console.log('User left room:', data);
      store.dispatch(removeParticipant(data.userId || data));
    });

    // User status/media updates
    this._socket.on('user-updated', (update) => {
      console.log('User updated:', update);
      store.dispatch(updateParticipant({
        id: update.userId,
        ...update.updates
      }));
    });

    this._socket.on('user-media-update', (data) => {
      console.log('User media update:', data);
      store.dispatch(updateParticipant({
        id: data.userId,
        isAudioEnabled: data.isAudioEnabled,
        isVideoEnabled: data.isVideoEnabled,
        isScreenSharing: data.isScreenSharing,
      }));
    });

    // Chat events
    this._socket.on('chat-message', (message) => {
      store.dispatch(addMessage(message));
    });

    // WebRTC events for signaling - delegate to WebRTC service
    this._socket.on('webrtc:offer', (data) => {
      console.log('Received WebRTC offer', data);
      webRTCService.handleIncomingOffer(data.from, data.offer);
    });

    this._socket.on('webrtc:answer', (data) => {
      console.log('Received WebRTC answer', data);
      webRTCService.handleIncomingAnswer(data.from, data.answer);
    });

    this._socket.on('webrtc:ice-candidate', (data) => {
      console.log('Received WebRTC ICE candidate', data);
      webRTCService.handleIncomingIceCandidate(data.from, data.candidate);
    });
  }

  /**
   * Update user media status
   * @param isAudioEnabled Whether audio is enabled
   * @param isVideoEnabled Whether video is enabled
   */
  updateUserMedia(isAudioEnabled: boolean, isVideoEnabled: boolean): void {
    if (!this._socket || !this.connected || !this.roomId || !this.userId) {
      console.error('Socket not connected or room/user not set');
      return;
    }

    this._socket.emit('user-media-updated', {
      roomId: this.roomId,
      userId: this.userId,
      isAudioEnabled,
      isVideoEnabled,
    });
  }

  /**
   * Set the local audio stream
   * @param stream Audio media stream
   */
  setAudioStream(stream: MediaStream): void {
    this.audioStream = stream;
    console.log('Audio stream set in socketService');
    
    // Emit event to update media state if connected
    if (this._socket && this.connected && this.roomId && this.userId) {
      this._socket.emit('user-media-updated', {
        roomId: this.roomId,
        userId: this.userId,
        isAudioEnabled: stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].enabled,
        hasAudioTrack: stream.getAudioTracks().length > 0
      });
    }
  }

  /**
   * Set the local video stream
   * @param stream Video media stream
   */
  setVideoStream(stream: MediaStream): void {
    this.videoStream = stream;
    console.log('Video stream set in socketService');
    
    // Emit event to update media state if connected
    if (this._socket && this.connected && this.roomId && this.userId) {
      this._socket.emit('user-media-updated', {
        roomId: this.roomId,
        userId: this.userId,
        isVideoEnabled: stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled,
        hasVideoTrack: stream.getVideoTracks().length > 0
      });
    }
  }
  
  /**
   * Set the local screen share stream
   * @param stream Screen share media stream or null when stopping
   */
  setScreenStream(stream: MediaStream | null): void {
    this.screenStream = stream;
    console.log('Screen share stream set in socketService:', stream ? 'active' : 'stopped');
    
    // Emit event to update screen sharing state if connected
    if (this._socket && this.connected && this.roomId && this.userId) {
      this._socket.emit('user-media-updated', {
        roomId: this.roomId,
        userId: this.userId,
        isScreenSharing: !!stream
      });
    }
  }

  /**
   * Register handler for remote streams
   * @param handler Function to call when a remote stream is received
   */
  onRemoteStream(handler: (stream: MediaStream, userId: string) => void): void {
    this.remoteStreamHandlers.push(handler);
  }

  /**
   * Register a callback for peer disconnected events
   * @param callback Function to call when a peer disconnects
   */
  onPeerDisconnected(callback: (peerId: string) => void): () => void {
    if (!this._socket) return () => {};
    
    // Store callback reference for cleanup
    const callbackRef = (userId: string) => {
      callback(userId);
    };
    
    this._socket.on('user-left', callbackRef);
    
    // Return a cleanup function
    return () => {
      if (this._socket) {
        this._socket.off('user-left', callbackRef);
      }
    };
  }

  /**
   * Register a callback for data channel messages
   * @param callback Function to call when a data channel message is received
   */
  onDataChannelMessage(callback: (peerId: string, data: any) => void): () => void {
    // Forward to webRTCService which actually handles the data channels
    return webRTCService.onDataChannelMessage(callback);
  }

  /**
   * Send data through WebRTC data channels
   * @param data Data to send
   * @param peerId Optional specific peer ID to send to (if not provided, sends to all peers)
   */
  sendData(data: any, peerId?: string): void {
    // Delegate to webRTCService which handles data channels
    webRTCService.sendData(data, peerId);
  }

  /**
   * Clear the whiteboard
   */
  clearWhiteboard(): void {
    if (!this._socket || !this.connected || !this.roomId) {
      console.error('Socket not connected or room not set');
      return;
    }

    this._socket.emit('whiteboard-clear', {
      roomId: this.roomId,
    });
  }

  /**
   * Register event handler for whiteboard cleared
   * @param callback Function to call when whiteboard is cleared
   */
  onWhiteboardCleared(callback: () => void): void {
    if (!this._socket) return;
    this._socket.on('whiteboard-cleared', callback);
  }

  /**
   * Get the socket instance (used by the RTK Query socket base query)
   * @returns The socket.io client instance
   */
  getSocket(): Socket {
    if (!this._socket) {
      // Auto-connect if not already connected
      this.connect();
      if (!this._socket) {
        throw new Error('Socket connection failed');
      }
    }
    return this._socket;
  }

  /**
   * Send WebRTC offer to a remote peer
   * @param to Peer ID to send the offer to
   * @param offer WebRTC offer
   */
  sendWebRTCOffer(to: string, offer: RTCSessionDescriptionInit): void {
    if (!this._socket || !this.connected) {
      console.error('Socket not connected');
      return;
    }

    this._socket.emit('webrtc:offer', {
      to,
      offer
    });
  }

  /**
   * Send WebRTC answer to a remote peer
   * @param to Peer ID to send the answer to
   * @param answer WebRTC answer
   */
  sendWebRTCAnswer(to: string, answer: RTCSessionDescriptionInit): void {
    if (!this._socket || !this.connected) {
      console.error('Socket not connected');
      return;
    }

    this._socket.emit('webrtc:answer', {
      to,
      answer
    });
  }

  /**
   * Send WebRTC ICE candidate to a remote peer
   * @param to Peer ID to send the ICE candidate to
   * @param candidate WebRTC ICE candidate
   */
  sendWebRTCIceCandidate(to: string, candidate: RTCIceCandidateInit): void {
    if (!this._socket || !this.connected) {
      console.error('Socket not connected');
      return;
    }

    this._socket.emit('webrtc:ice-candidate', {
      to,
      candidate
    });
  }
}

// Create a singleton instance
const socketService = new SocketService();
export default socketService;