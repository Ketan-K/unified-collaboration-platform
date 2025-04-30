// Import types only from socket-io client to prevent circular dependency
import { Socket } from "socket.io-client";
import socketService from "./socketService";

/**
 * Service for managing WebRTC connections and data channels
 */
class WebRTCService {
  private audioStream: MediaStream | null = null;
  private videoStream: MediaStream | null = null;
  private screenShareStream: MediaStream | null = null;
  private userId: string | null = null;
  
  // WebRTC related properties
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private iceCandidatesQueue: Map<string, RTCIceCandidate[]> = new Map();
  
  // Event callbacks
  private onRemoteStreamCallbacks: ((peerId: string, stream: MediaStream) => void)[] = [];
  private onPeerDisconnectedCallbacks: ((peerId: string) => void)[] = [];
  private onDataChannelMessageCallbacks: ((peerId: string, data: any) => void)[] = [];
  
  // Function to get socket - breaking the circular dependency
  private getSocketFn: (() => Socket | null) | null = null;
  
  // ICE servers configuration
  private iceServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ];

  constructor() {
    // We'll set up the signaling listeners after the socket service provides us with the getter function
  }

  /**
   * Set the function to get the socket
   */
  setSocketGetter(getSocketFn: () => Socket | null) {
    this.getSocketFn = getSocketFn;
    console.log('WebRTC service: socket getter set');
  }

  /**
   * Set the user ID
   */
  setUserId(userId: string) {
    this.userId = userId;
    console.log(`WebRTC service: user ID set to ${userId}`);
  }

  /**
   * Set the audio stream
   */
  setAudioStream(stream: MediaStream | null) {
    this.audioStream = stream;
    // Update all existing peer connections with the new stream
    if (stream) {
      this.updateAudioTrack(stream.getAudioTracks()[0] || null);
    } else {
      this.updateAudioTrack(null);
    }
  }

  /**
   * Set the video stream
   */
  setVideoStream(stream: MediaStream | null) {
    this.videoStream = stream;
    // Update all existing peer connections with the new stream
    if (stream) {
      this.updateVideoTrack(stream.getVideoTracks()[0] || null);
    } else {
      this.updateVideoTrack(null);
    }
  }

  /**
   * Set the screen share stream
   */
  setScreenShareStream(stream: MediaStream | null) {
    this.screenShareStream = stream;
    // Update all existing peer connections with the new stream
    this.updateMediaTracks();
  }

  /**
   * Handle incoming WebRTC offer
   * @param peerId Peer ID that sent the offer
   * @param offer WebRTC offer
   */
  async handleIncomingOffer(peerId: string, offer: RTCSessionDescriptionInit) {
    try {
      console.log(`Handling WebRTC offer from ${peerId}`);
      const peerConnection = this.createPeerConnection(peerId);
      
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      // Send answer back to the peer
      socketService.sendWebRTCAnswer(peerId, answer);
      
      // Process any queued ICE candidates for this peer
      if (this.iceCandidatesQueue.has(peerId)) {
        const candidates = this.iceCandidatesQueue.get(peerId) || [];
        candidates.forEach(candidate => {
          peerConnection.addIceCandidate(candidate)
            .catch(err => console.error("Error adding queued ICE candidate:", err));
        });
        this.iceCandidatesQueue.delete(peerId);
      }
    } catch (err) {
      console.error("Error handling WebRTC offer:", err);
    }
  }

  /**
   * Handle incoming WebRTC answer
   * @param peerId Peer ID that sent the answer
   * @param answer WebRTC answer
   */
  async handleIncomingAnswer(peerId: string, answer: RTCSessionDescriptionInit) {
    try {
      console.log(`Handling WebRTC answer from ${peerId}`);
      const peerConnection = this.peerConnections.get(peerId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        console.log(`Remote description set successfully for peer ${peerId}`);
      } else {
        console.warn(`No peer connection found for ${peerId} to handle answer`);
      }
    } catch (err) {
      console.error("Error handling WebRTC answer:", err);
    }
  }

  /**
   * Handle incoming ICE candidate
   * @param peerId Peer ID that sent the ICE candidate
   * @param candidate ICE candidate
   */
  async handleIncomingIceCandidate(peerId: string, candidate: RTCIceCandidateInit) {
    try {
      console.log(`Handling ICE candidate from ${peerId}`);
      const peerConnection = this.peerConnections.get(peerId);
      
      if (peerConnection && peerConnection.remoteDescription) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        // Queue the ICE candidate if the peer connection or remote description isn't ready
        if (!this.iceCandidatesQueue.has(peerId)) {
          this.iceCandidatesQueue.set(peerId, []);
        }
        this.iceCandidatesQueue.get(peerId)?.push(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.error("Error handling ICE candidate:", err);
    }
  }

  /**
   * Create a new peer connection
   */
  createPeerConnection(peerId: string) {
    // Close any existing connection first
    if (this.peerConnections.has(peerId)) {
      this.closePeerConnection(peerId);
    }
    
    console.log(`Creating new peer connection for ${peerId}`);
    
    // Create new connection
    const peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });
    this.peerConnections.set(peerId, peerConnection);
    
    // Add local streams if available
    this.addLocalStreams(peerConnection);
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`Sending ICE candidate to ${peerId}`);
        socketService.sendWebRTCIceCandidate(peerId, event.candidate);
      }
    };
    
    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state with ${peerId}: ${peerConnection.connectionState}`);
      if (peerConnection.connectionState === 'disconnected' || 
          peerConnection.connectionState === 'failed' ||
          peerConnection.connectionState === 'closed') {
        this.closePeerConnection(peerId);
        this.onPeerDisconnectedCallbacks.forEach(callback => callback(peerId));
      }
    };
    
    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${peerId}: ${peerConnection.iceConnectionState}`);
    };
    
    // Handle negotiation needed
    peerConnection.onnegotiationneeded = async () => {
      try {
        console.log(`Negotiation needed for ${peerId}`);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        // Send offer to the peer
        console.log(`Sending WebRTC offer to ${peerId}`);
        socketService.sendWebRTCOffer(peerId, peerConnection.localDescription as RTCSessionDescriptionInit);
      } catch (err) {
        console.error(`Error creating offer for ${peerId}:`, err);
      }
    };
    
    // Handle remote tracks
    peerConnection.ontrack = (event) => {
      console.log(`Received remote track from ${peerId}`, event.streams);
      const remoteStream = event.streams[0];
      this.onRemoteStreamCallbacks.forEach(callback => callback(peerId, remoteStream));
    };
    
    // Setup data channel
    this.setupDataChannel(peerId, peerConnection);
    
    return peerConnection;
  }
  
  /**
   * Add local streams to a peer connection
   */
  private addLocalStreams(peerConnection: RTCPeerConnection) {
    // Add audio tracks if available
    if (this.audioStream) {
      const audioTracks = this.audioStream.getAudioTracks();
      audioTracks.forEach(track => {
        peerConnection.addTrack(track, this.audioStream!);
      });
    }
    
    // Add video tracks if available
    if (this.videoStream) {
      const videoTracks = this.videoStream.getVideoTracks();
      videoTracks.forEach(track => {
        peerConnection.addTrack(track, this.videoStream!);
      });
    }
    
    // Add screen share tracks if available
    if (this.screenShareStream) {
      const screenTracks = this.screenShareStream.getVideoTracks();
      screenTracks.forEach(track => {
        peerConnection.addTrack(track, this.screenShareStream!);
      });
    }
  }
  
  /**
   * Update media tracks in all existing peer connections
   */
  private updateMediaTracks() {
    this.peerConnections.forEach((pc, peerId) => {
      // Remove all existing senders
      const senders = pc.getSenders();
      senders.forEach(sender => {
        pc.removeTrack(sender);
      });
      
      // Add current tracks
      this.addLocalStreams(pc);
    });
  }
  
  /**
   * Update audio track in all peer connections
   */
  updateAudioTrack(track: MediaStreamTrack | null) {
    this.peerConnections.forEach((pc, peerId) => {
      const senders = pc.getSenders();
      const audioSender = senders.find(s => s.track?.kind === 'audio');
      
      if (audioSender) {
        audioSender.replaceTrack(track);
      } else if (track) {
        const stream = new MediaStream([track]);
        pc.addTrack(track, stream);
      }
    });
  }
  
  /**
   * Update video track in all peer connections
   */
  updateVideoTrack(track: MediaStreamTrack | null) {
    this.peerConnections.forEach((pc, peerId) => {
      const senders = pc.getSenders();
      const videoSender = senders.find(s => s.track?.kind === 'video');
      
      if (videoSender) {
        videoSender.replaceTrack(track);
      } else if (track) {
        const stream = new MediaStream([track]);
        pc.addTrack(track, stream);
      }
    });
  }
  
  /**
   * Set up data channel for a peer connection
   */
  private setupDataChannel(peerId: string, peerConnection: RTCPeerConnection) {
    try {
      // Create data channel
      const dataChannel = peerConnection.createDataChannel(`data-channel-${peerId}`);
      
      // Set up data channel event handlers
      dataChannel.onopen = () => {
        console.log(`Data channel with ${peerId} opened`);
        this.dataChannels.set(peerId, dataChannel);
      };
      
      dataChannel.onclose = () => {
        console.log(`Data channel with ${peerId} closed`);
        this.dataChannels.delete(peerId);
      };
      
      dataChannel.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.onDataChannelMessageCallbacks.forEach(callback => callback(peerId, data));
        } catch (err) {
          console.error(`Error parsing data channel message:`, err);
        }
      };
      
      // Handle incoming data channels
      peerConnection.ondatachannel = (event) => {
        const incomingDataChannel = event.channel;
        
        incomingDataChannel.onopen = () => {
          console.log(`Incoming data channel from ${peerId} opened`);
          this.dataChannels.set(peerId, incomingDataChannel);
        };
        
        incomingDataChannel.onclose = () => {
          console.log(`Incoming data channel from ${peerId} closed`);
          this.dataChannels.delete(peerId);
        };
        
        incomingDataChannel.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.onDataChannelMessageCallbacks.forEach(callback => callback(peerId, data));
          } catch (err) {
            console.error(`Error parsing incoming data channel message:`, err);
          }
        };
      };
    } catch (err) {
      console.error(`Error setting up data channel for ${peerId}:`, err);
    }
  }
  
  /**
   * Close a peer connection
   */
  closePeerConnection(peerId: string) {
    // Close data channel if exists
    if (this.dataChannels.has(peerId)) {
      this.dataChannels.get(peerId)?.close();
      this.dataChannels.delete(peerId);
    }
    
    // Close peer connection if exists
    if (this.peerConnections.has(peerId)) {
      this.peerConnections.get(peerId)?.close();
      this.peerConnections.delete(peerId);
    }
    
    // Clean up ICE candidate queue if exists
    if (this.iceCandidatesQueue.has(peerId)) {
      this.iceCandidatesQueue.delete(peerId);
    }
  }
  
  /**
   * Initiate a connection with a peer
   */
  initiateConnection(peerId: string) {
    // Skip self connection
    if (peerId === this.userId) {
      console.log("Skipping self connection");
      return;
    }
    
    console.log(`Initiating connection with peer: ${peerId}`);
    this.createPeerConnection(peerId);
  }
  
  /**
   * Send data through a data channel
   */
  sendData(data: any, peerId?: string) {
    try {
      const jsonData = JSON.stringify(data);
      
      if (peerId) {
        // Send to specific peer
        if (this.dataChannels.has(peerId) && this.dataChannels.get(peerId)?.readyState === 'open') {
          this.dataChannels.get(peerId)?.send(jsonData);
        }
      } else {
        // Send to all peers
        this.dataChannels.forEach((channel, id) => {
          if (channel.readyState === 'open') {
            channel.send(jsonData);
          }
        });
      }
    } catch (err) {
      console.error("Error sending data through data channel:", err);
    }
  }
  
  /**
   * Register a callback for remote stream events
   */
  onRemoteStream(callback: (peerId: string, stream: MediaStream) => void) {
    this.onRemoteStreamCallbacks.push(callback);
    return () => {
      const index = this.onRemoteStreamCallbacks.indexOf(callback);
      if (index !== -1) this.onRemoteStreamCallbacks.splice(index, 1);
    };
  }
  
  /**
   * Register a callback for peer disconnected events
   */
  onPeerDisconnected(callback: (peerId: string) => void) {
    this.onPeerDisconnectedCallbacks.push(callback);
    return () => {
      const index = this.onPeerDisconnectedCallbacks.indexOf(callback);
      if (index !== -1) this.onPeerDisconnectedCallbacks.splice(index, 1);
    };
  }
  
  /**
   * Register a callback for data channel messages
   */
  onDataChannelMessage(callback: (peerId: string, data: any) => void) {
    this.onDataChannelMessageCallbacks.push(callback);
    return () => {
      const index = this.onDataChannelMessageCallbacks.indexOf(callback);
      if (index !== -1) this.onDataChannelMessageCallbacks.splice(index, 1);
    };
  }
  
  /**
   * Clean up all connections
   */
  cleanup() {
    // Close all peer connections
    this.peerConnections.forEach((pc, peerId) => {
      this.closePeerConnection(peerId);
    });
    
    // Clear all callbacks
    this.onRemoteStreamCallbacks = [];
    this.onPeerDisconnectedCallbacks = [];
    this.onDataChannelMessageCallbacks = [];
    
    // Clear streams
    this.audioStream = null;
    this.videoStream = null;
    this.screenShareStream = null;
  }
}

// Export singleton instance
const webRTCService = new WebRTCService();
export default webRTCService;