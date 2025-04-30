import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector } from '../../../lib/hooks/reduxHooks';
import { MicIcon, MicOffIcon, PinIcon, HandIcon } from '../../icons/MediaIcons';
import IconButton from '../../ui/IconButton';
import { useMedia } from './providers/MediaProvider';

interface VideoStreamProps {
  participant: {
    id: string;
    name: string;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isScreenSharing: boolean;
    isHandRaised: boolean;
    stream?: MediaStream;
  };
  isPinned: boolean;
  onPinVideo: (id: string) => void;
}

// Component for remote participant videos (non-local)
const RemoteVideoStream: React.FC<VideoStreamProps> = ({ participant, isPinned, onPinVideo }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  const activeSpeaker = useAppSelector(state => state.room.activeSpeaker);
  
  // Connect stream to video element when component mounts or stream changes
  useEffect(() => {
    // Skip if no stream
    if (!participant.stream) return;
    
    let mounted = true;
    const abortController = new AbortController();
    const signal = abortController.signal;
    
    if (videoRef.current) {
      try {
        // Connect the stream to the video element
        videoRef.current.srcObject = participant.stream;
        
        // Try to play the video
        const playPromise = videoRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              if (mounted) setVideoActive(true);
            })
            .catch((err) => {
              if (mounted && !signal.aborted) {
                console.error(`Error playing video for ${participant.id}:`, err);
                // Try again after a delay
                const retryTimeout = setTimeout(() => {
                  if (videoRef.current && mounted && !signal.aborted) {
                    videoRef.current.play()
                      .then(() => {
                        if (mounted) setVideoActive(true);
                      })
                      .catch(retryErr => {
                        if (mounted) {
                          console.error(`Second attempt failed for ${participant.id}:`, retryErr);
                          setVideoActive(false);
                        }
                      });
                  }
                }, 1000);
                
                // Clear timeout if aborted
                signal.addEventListener('abort', () => {
                  clearTimeout(retryTimeout);
                });
              }
            });
        }
      } catch (err) {
        console.error(`Error connecting stream for ${participant.id}:`, err);
      }
    }
    
    // Cleanup function to handle component unmounting or stream changes
    return () => {
      mounted = false;
      abortController.abort();
      
      // Safely stop connection to video element
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    };
  }, [participant.stream, participant.id]);

  // Effect to detect if this participant is the active speaker
  useEffect(() => {
    setIsSpeaking(activeSpeaker === participant.id);
  }, [activeSpeaker, participant.id]);

  // Determine if we should show video or avatar
  const hasVideoTracks = !!participant.stream?.getVideoTracks().some(t => t.enabled && t.readyState === 'live');
  const showAvatar = !hasVideoTracks || !participant.isVideoEnabled;

  return (
    <motion.div 
      className={`relative rounded-lg overflow-hidden shadow-lg ${
        isPinned ? 'col-span-2 row-span-2' : ''
      } ${isSpeaking ? 'ring-2 ring-blue-500' : ''}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      layout="position"
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Always render video container */}
      <div className="relative w-full h-full overflow-hidden bg-gray-800">
        {/* Always render the video element when we have a stream */}
        {participant.stream && (
          <video 
            ref={videoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${showAvatar ? 'opacity-0' : 'opacity-100'}`}
          />
        )}
        
        {/* Show avatar when needed */}
        {showAvatar && (
          <div className="absolute inset-0 w-full h-full bg-gray-800 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-medium mx-auto">
                {participant.name.charAt(0).toUpperCase()}
              </div>
              <div className="mt-2 text-white text-sm">
                {participant.name}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Screen sharing indicator */}
      {participant.isScreenSharing && (
        <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-md">
          Sharing Screen
        </div>
      )}
      
      {/* Hand raised indicator */}
      {participant.isHandRaised && (
        <div className="absolute top-2 right-2 bg-yellow-500 text-white rounded-full p-1">
          <HandIcon size={16} />
        </div>
      )}
      
      {/* Video controls */}
      <div className="absolute top-2 right-2 flex space-x-1">
        <IconButton
          icon={<PinIcon />}
          variant={isPinned ? 'primary' : 'transparent'}
          size="sm"
          ariaLabel={isPinned ? 'Unpin video' : 'Pin video'}
          tooltip={isPinned ? 'Unpin' : 'Pin'}
          onClick={() => onPinVideo(participant.id)}
          isActive={isPinned}
        />
      </div>
      
      {/* Bottom bar with name and audio state */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-medium truncate">
              {participant.name}
            </span>
            {isSpeaking && (
              <span className="bg-blue-500 text-xs px-1.5 py-0.5 rounded-md">
                Speaking
              </span>
            )}
          </div>
          
          {/* Audio indicator */}
          <div>
            {participant.isAudioEnabled ? (
              <MicIcon size={16} />
            ) : (
              <MicOffIcon size={16} color="#F87171" />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Component for local video
const LocalVideoStream: React.FC<{
  isPinned: boolean;
  onPinVideo: (id: string) => void;
}> = ({ isPinned, onPinVideo }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { localStream, isAudioEnabled, isVideoEnabled } = useMedia();
  const userName = useAppSelector(state => state.user?.userName || 'You');
  const userId = useAppSelector(state => state.user?.userId || 'local');
  const isSpeaking = useAppSelector(state => state.room.activeSpeaker === userId);
  const [videoActive, setVideoActive] = useState(false);
  
  // Connect local stream from MediaProvider directly to video element
  useEffect(() => {
    if (!videoRef.current || !localStream) return;

    console.log("LocalVideoStream: Directly connecting MediaProvider stream");
    console.log("LocalVideoStream: Video tracks:", localStream.getVideoTracks().map(t => ({
      id: t.id,
      enabled: t.enabled,
      state: t.readyState
    })));
    
    let mounted = true;
    const abortController = new AbortController();
    const signal = abortController.signal;
    
    try {
      // Connect the stream
      videoRef.current.srcObject = localStream;
      
      // Try to play the video
      const playPromise = videoRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (mounted) {
              console.log("LocalVideoStream: Video playing successfully");
              setVideoActive(true);
            }
          })
          .catch((err) => {
            // Only proceed if component is still mounted and not aborted
            if (mounted && !signal.aborted) {
              console.error("LocalVideoStream: Error playing video:", err);
              // Try again with a delay
              const retryTimeout = setTimeout(() => {
                if (videoRef.current && mounted && !signal.aborted) {
                  videoRef.current.play()
                    .then(() => {
                      if (mounted) setVideoActive(true);
                    })
                    .catch(e => {
                      if (mounted) console.error("LocalVideoStream: Second attempt failed:", e);
                    });
                }
              }, 1000);
              
              // Clear timeout if aborted
              signal.addEventListener('abort', () => {
                clearTimeout(retryTimeout);
              });
            }
          });
      }
    } catch (err) {
      console.error("LocalVideoStream: Error connecting stream:", err);
    }
    
    // Cleanup function to handle component unmounting
    return () => {
      mounted = false;
      abortController.abort();
      
      // Safely stop connection to video element
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    };
  }, [localStream]);

  // Force show video if we have a stream with video tracks
  const hasVideoTracks = !!localStream?.getVideoTracks().length;
  const showVideo = hasVideoTracks && isVideoEnabled;
  const showAvatar = !showVideo;

  return (
    <motion.div 
      className={`relative rounded-lg overflow-hidden shadow-lg ${
        isPinned ? 'col-span-2 row-span-2' : ''
      } ${isSpeaking ? 'ring-2 ring-blue-500' : ''}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      layout="position"
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Always render video container */}
      <div className="relative w-full h-full overflow-hidden bg-gray-800">
        {/* Always render the video element when we have a stream */}
        {localStream && (
          <video 
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${showAvatar ? 'opacity-0' : 'opacity-100'}`}
          />
        )}
        
        {/* Show avatar when needed */}
        {showAvatar && (
          <div className="absolute inset-0 w-full h-full bg-gray-800 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-medium mx-auto">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="mt-2 text-white text-sm">
                {userName} (You)
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Video controls */}
      <div className="absolute top-2 right-2 flex space-x-1">
        <IconButton
          icon={<PinIcon />}
          variant={isPinned ? 'primary' : 'transparent'}
          size="sm"
          ariaLabel={isPinned ? 'Unpin video' : 'Pin video'}
          tooltip={isPinned ? 'Unpin' : 'Pin'}
          onClick={() => onPinVideo(userId)}
          isActive={isPinned}
        />
      </div>
      
      {/* Bottom bar with name and audio state */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-medium truncate">
              {userName} (You)
            </span>
            {isSpeaking && (
              <span className="bg-blue-500 text-xs px-1.5 py-0.5 rounded-md">
                Speaking
              </span>
            )}
          </div>
          
          {/* Audio indicator */}
          <div>
            {isAudioEnabled ? (
              <MicIcon size={16} />
            ) : (
              <MicOffIcon size={16} color="#F87171" />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Main VideoGrid component
const VideoGrid: React.FC = () => {
  const participants = useAppSelector(state => state.room.participants);
  const userId = useAppSelector(state => state.user?.userId || 'local');
  const isScreenSharing = useAppSelector(state => 
    Object.values(participants).some(p => p.isScreenSharing));
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);
  
  // Get remote streams from the MediaProvider context
  const { remoteStreams } = useMedia();
  
  // Filter out local participant - we'll handle that separately
  const remoteParticipants = Object.values(participants).filter(p => p.id !== userId);

  // Connect remote streams to participant objects
  const remoteParticipantsWithStreams = remoteParticipants.map(participant => {
    // Get the stream for this participant from the remoteStreams Map
    const remoteStream = remoteStreams.get(participant.id);
    
    // Return a new object with the stream included
    return {
      ...participant,
      stream: remoteStream || null
    };
  });

  // Handle pinning a video
  const handlePinVideo = (participantId: string) => {
    setPinnedParticipantId(prevId => prevId === participantId ? null : participantId);
  };

  // Determine grid layout based on number of participants and screen sharing
  const getGridClassName = () => {
    // Count includes remote + 1 for local
    const count = remoteParticipantsWithStreams.length + 1;
    
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2 grid-rows-2';
    if (count <= 9) return 'grid-cols-3 grid-rows-3';
    
    return 'grid-cols-4'; // For more participants
  };

  return (
    <div className="h-full w-full overflow-hidden bg-gray-900 p-2 rounded-lg">
      <div 
        className={`grid gap-2 h-full ${getGridClassName()} ${
          isScreenSharing ? 'grid-rows-2' : ''
        }`}
      >
        <AnimatePresence>
          {/* Render the local participant first */}
          <LocalVideoStream 
            key="local-video"
            isPinned={pinnedParticipantId === userId}
            onPinVideo={handlePinVideo}
          />

          {/* Then render remote participants */}
          {remoteParticipantsWithStreams.map(participant => {
            const isPinned = pinnedParticipantId === participant.id;
            
            // Show screen sharing participants first
            if (participant.isScreenSharing) {
              return (
                <RemoteVideoStream
                  key={participant.id}
                  participant={participant}
                  isPinned={true}
                  onPinVideo={handlePinVideo}
                />
              );
            }
            
            // Then show the pinned participant
            if (isPinned) {
              return (
                <RemoteVideoStream
                  key={participant.id}
                  participant={participant}
                  isPinned={true}
                  onPinVideo={handlePinVideo}
                />
              );
            }
            
            // Then show regular participants
            return (
              <RemoteVideoStream
                key={participant.id}
                participant={participant}
                isPinned={false}
                onPinVideo={handlePinVideo}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VideoGrid;