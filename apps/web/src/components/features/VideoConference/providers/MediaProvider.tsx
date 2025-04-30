import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import mediaService from '../../../../utils/media/mediaService';
import socketService from '../../../../utils/socket/socketService';
import webRTCService from '../../../../utils/socket/webRTCService';
import { useAppDispatch, useAppSelector } from '../../../../lib/hooks/reduxHooks';
import { addParticipant, removeParticipant, updateParticipant } from '../../../../lib/redux/slices/roomSlice';

// Static tracking object to ensure initialization only happens once globally
// regardless of how many times the component mounts
const initTracking = {
  initialized: false,
  initializing: false,
  roomsJoined: new Set<string>()
};

// Define the context type
interface MediaContextType {
  localStream: MediaStream | null;
  screenShareStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  toggleAudio: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
}

// Create the context with default values
const MediaContext = createContext<MediaContextType>({
  localStream: null,
  screenShareStream: null,
  remoteStreams: new Map(),
  isAudioEnabled: false,
  isVideoEnabled: false,
  isScreenSharing: false,
  toggleAudio: async () => {},
  toggleVideo: async () => {},
  toggleScreenShare: async () => {},
});

// Hook for components to access media context
export const useMedia = () => useContext(MediaContext);

// Props for Media Provider
interface MediaProviderProps {
  children: ReactNode;
  roomId?: string;
}

// Media Provider component
const MediaProvider: React.FC<MediaProviderProps> = ({ children, roomId }) => {
  // State for media streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  
  // State for media device status
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(true);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  
  // Flag to prevent joining room multiple times
  const hasJoinedRoomRef = React.useRef<boolean>(false);
  // Flag to prevent initializing media multiple times
  const hasInitMediaRef = React.useRef<boolean>(false);

  const dispatch = useAppDispatch();
  
  // Get user data from Redux
  const userId = useAppSelector(state => state.user?.userId || '');
  const userName = useAppSelector(state => state.user?.userName || 'User');

  // Initialize media on component mount - use a ref to ensure it only runs once
  // regardless of dependency array changes
  useEffect(() => {
    // Skip initialization if already done or in progress
    if (initTracking.initializing) {
      console.log('Initialization already in progress, skipping');
      return;
    }
    
    if (initTracking.initialized) {
      console.log('Already initialized, skipping duplicate initialization');
      return;
    }
    
    // Set initializing flag to prevent concurrent initialization
    initTracking.initializing = true;
    
    const initSocket = async () => {
      // First ensure socket connection is established
      console.log('Initializing socket connection...');
      const connected = await socketService.connect();
      console.log('Socket connection initialized:', connected ? 'SUCCESS' : 'FAILED');
      
      // Add a small delay to ensure all socket handlers are registered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Only attempt to join room after successful socket connection
      // And only if we haven't already joined this room
      if (connected && roomId && !initTracking.roomsJoined.has(roomId)) {
        console.log('Attempting to join room:', roomId);
        
        // Set the user ID in WebRTC service
        webRTCService.setUserId(userId);
        
        // Join room with correct parameter order
        socketService.joinRoom(roomId, userId, userName);
        
        // Mark that we've joined the room
        initTracking.roomsJoined.add(roomId);
        hasJoinedRoomRef.current = true;
        
        console.log('Joined room with user ID:', userId);
      }
    };

    const initMedia = async () => {
      try {
        console.log('Initializing media streams...');
        // Initialize audio and video separately for better control
        const audioStream = await mediaService.initializeAudioStream(true);
        const videoStream = await mediaService.initializeVideoStream(true);
        
        // Get the combined stream for UI
        const combinedStream = mediaService.getCombinedStream();
        
        if (combinedStream) {
          setLocalStream(combinedStream);
          
          // Set initial state based on actual tracks
          const audioTracks = combinedStream.getAudioTracks();
          const videoTracks = combinedStream.getVideoTracks();
          
          setIsAudioEnabled(audioTracks.length > 0 && audioTracks.some(track => track.enabled));
          setIsVideoEnabled(videoTracks.length > 0 && videoTracks.some(track => track.enabled));
          
          console.log("MediaProvider: Initial stream set with audio:", 
            audioTracks.length > 0 && audioTracks.some(track => track.enabled), 
            "video:", videoTracks.length > 0 && videoTracks.some(track => track.enabled));
          
          // Mark that we've initialized media streams
          hasInitMediaRef.current = true;
        }
      } catch (error) {
        console.error('Error initializing media:', error);
      }
    };
    
    // Initialize in sequence
    initSocket()
      .then(initMedia)
      .then(() => setupWebRTCEventHandlers())
      .then(() => {
        // Mark initialization as complete
        initTracking.initialized = true;
        initTracking.initializing = false;
      })
      .catch(error => {
        console.error('Error during initialization:', error);
        // Reset initializing flag if there was an error
        initTracking.initializing = false;
      });
    
    // Cleanup when component unmounts
    return () => {
      // Only attempt to leave the room if we previously joined it
      if (roomId && initTracking.roomsJoined.has(roomId)) {
        console.log('Leaving room:', roomId);
        socketService.leaveRoom();
        initTracking.roomsJoined.delete(roomId);
        hasJoinedRoomRef.current = false;
      }
      
      // Don't cleanup media services on unmount during development
      // This prevents the duplicate initialization/cleanup cycle in StrictMode
      if (process.env.NODE_ENV === 'production') {
        mediaService.cleanup();
        cleanupWebRTC();
        initTracking.initialized = false;
      }
    };
  // Use an empty dependency array to ensure this only runs once
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Setup WebRTC event handlers
  const setupWebRTCEventHandlers = () => {
    console.log("Setting up WebRTC event handlers");
    
    // Handle remote streams - forward from socketService to webRTCService
    webRTCService.onRemoteStream((peerId, stream) => {
      console.log(`Received stream from peer: ${peerId}`, stream);
      setRemoteStreams(prev => {
        const updated = new Map(prev);
        updated.set(peerId, stream);
        return updated;
      });
      
      // Update participant in redux state
      dispatch(addParticipant({
        id: peerId,
        name: `Peer ${peerId}`,
        isAudioEnabled: stream.getAudioTracks().some(t => t.enabled),
        isVideoEnabled: stream.getVideoTracks().some(t => t.enabled),
        isScreenSharing: false,
        isHandRaised: false,
        stream: null, // We don't store the stream in Redux, it's too large
      }));
    });
    
    // Handle peer disconnection
    socketService.onPeerDisconnected((peerId) => {
      console.log(`Peer disconnected: ${peerId}`);
      setRemoteStreams(prev => {
        const updated = new Map(prev);
        updated.delete(peerId);
        return updated;
      });
      
      // Remove participant from redux state
      dispatch(removeParticipant(peerId));
    });
    
    // Handle data channel messages
    socketService.onDataChannelMessage((peerId, data) => {
      console.log(`Received data channel message from ${peerId}:`, data);
      if (data.type === 'media-state') {
        // Update the participant's media state in redux
        dispatch(updateParticipant({
          id: peerId,
          isAudioEnabled: data.isAudioEnabled,
          isVideoEnabled: data.isVideoEnabled,
          isScreenSharing: data.isScreenSharing,
          isHandRaised: data.isHandRaised,
        }));
      }
    });
  };
  
  // Cleanup WebRTC connections
  const cleanupWebRTC = () => {
    webRTCService.cleanup();
    setRemoteStreams(new Map());
  };

  // Audio toggle
  const toggleAudio = async () => {
    try {
      const success = await mediaService.toggleAudio(!isAudioEnabled);
      if (success !== undefined) {
        setIsAudioEnabled(success);
        
        // Update our localStream reference if it changed
        const updatedStream = mediaService.getLocalStream();
        if (updatedStream !== localStream) {
          setLocalStream(updatedStream);
        }
        
        // Notify peers about the audio state change
        socketService.sendData({
          type: 'media-state',
          isAudioEnabled: success,
          isVideoEnabled,
          isScreenSharing,
          isHandRaised: false,
        });
      }
    } catch (error) {
      console.error('Error toggling audio:', error);
    }
  };

  // Video toggle
  const toggleVideo = async () => {
    try {
      console.log("Toggling video to", !isVideoEnabled);
      const newDesiredState = !isVideoEnabled;
      const result = await mediaService.toggleVideo(newDesiredState);
      
      // Update our localStream reference 
      const updatedStream = mediaService.getLocalStream();
      setLocalStream(updatedStream);
      
      if (typeof result === 'boolean') {
        // Operation succeeded - update state to match the new desired state
        console.log(`Successfully toggled video to ${result}`);
        setIsVideoEnabled(result);
        
        // Notify peers about the video state change
        socketService.sendData({
          type: 'media-state',
          isAudioEnabled,
          isVideoEnabled: result,
          isScreenSharing,
          isHandRaised: false,
        });
      } else {
        console.log(`Failed to toggle video to ${newDesiredState}`);
        
        // If toggle failed, revert the state to match actual media state
        const actualVideoEnabled = updatedStream?.getVideoTracks().some(track => 
          track.enabled && track.readyState === 'live') || false;
        
        setIsVideoEnabled(actualVideoEnabled);
      }
    } catch (error) {
      console.error('Error toggling video:', error);
    }
  };

  // Screen sharing toggle
  const toggleScreenShare = async () => {
    try {
      const { active, stream } = await mediaService.toggleScreenShare();
      setIsScreenSharing(active);
      setScreenShareStream(stream);
      
      // Notify peers about screen sharing state change
      socketService.sendData({
        type: 'media-state',
        isAudioEnabled,
        isVideoEnabled,
        isScreenSharing: active,
        isHandRaised: false,
      });
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  };

  // Value for the context provider
  const contextValue: MediaContextType = {
    localStream,
    screenShareStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
  };

  return (
    <MediaContext.Provider value={contextValue}>
      {children}
    </MediaContext.Provider>
  );
};

export default MediaProvider;