import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../lib/hooks/reduxHooks';
import IconButton from '../../ui/IconButton';
import {
  MicIcon,
  MicOffIcon,
  VideoIcon,
  VideoOffIcon,
  ScreenShareIcon,
  ScreenShareOffIcon,
  ChatIcon,
  SettingsIcon,
  ParticipantsIcon,
  HandIcon,
  WhiteboardIcon,
  CodeIcon,
} from '../../icons/MediaIcons';
import { toggleAudio, toggleVideo, toggleScreenSharing, toggleHandRaised } from '../../../lib/redux/slices/userSlice';
import socketService from '../../../utils/socket/socketService';
import { store } from '../../../lib/redux/store';
import { useMedia } from './providers/MediaProvider';

interface MediaControlsProps {
  localStream: MediaStream | null;
  onToggleFeature?: (feature: string) => void;
  onToggleAudio?: () => void;
  onToggleVideo?: () => void;
  onToggleScreenShare?: () => void;
}

const MediaControls: React.FC<MediaControlsProps> = ({ 
  localStream, 
  onToggleFeature,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare 
}) => {
  const dispatch = useAppDispatch();
  
  // Use the media context instead of Redux state for audio/video state
  const { isAudioEnabled, isVideoEnabled, isScreenSharing } = useMedia();
  const { isHandRaised } = useAppSelector(state => (state as any).user);
  
  const [showMore, setShowMore] = useState(false);
  
  const handleToggleAudio = () => {
    // Call parent handler which uses MediaProvider
    if (onToggleAudio) {
      onToggleAudio();
    }
  };
  
  const handleToggleVideo = () => {
    // Call parent handler which uses MediaProvider
    if (onToggleVideo) {
      onToggleVideo();
    }
  };
  
  const handleToggleScreenShare = () => {
    // Call parent handler if provided
    if (onToggleScreenShare) {
      onToggleScreenShare();
      return;
    }
    
    if (isScreenSharing) {
      // Stop screen sharing
      dispatch(toggleScreenSharing(false));
      socketService.updateUserMedia(isAudioEnabled, isVideoEnabled);
    } else {
      // Start screen sharing
      navigator.mediaDevices.getDisplayMedia({ video: true })
        .then(stream => {
          // Handle new screen share stream
          dispatch(toggleScreenSharing(true));
          
          // When user stops sharing via the browser UI
          stream.getVideoTracks()[0].onended = () => {
            dispatch(toggleScreenSharing(false));
            socketService.updateUserMedia(isAudioEnabled, isVideoEnabled);
          };
        })
        .catch(err => {
          console.error('Error sharing screen:', err);
          dispatch(toggleScreenSharing(false));
        });
    }
  };
  
  const handleToggleHandRaised = () => {
    const newState = !isHandRaised;
    dispatch(toggleHandRaised(newState));
    
    // Emit hand raised status to other participants
    const { roomId, userId } = (store.getState() as any).room;
    socketService.socket?.emit('user-status-update', {
      roomId,
      userId,
      updates: {
        isHandRaised: newState
      }
    });
  };

  // Log actual state for debugging
  useEffect(() => {
    console.log("MediaControls using MediaProvider state - Audio:", isAudioEnabled, "Video:", isVideoEnabled);
  }, [isAudioEnabled, isVideoEnabled]);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 shadow-lg">
      {/* Primary controls */}
      <div className="flex items-center space-x-3">
        <IconButton
          icon={isAudioEnabled ? <MicIcon /> : <MicOffIcon />}
          variant={isAudioEnabled ? 'primary' : 'danger'}
          size="lg"
          ariaLabel={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          label={isAudioEnabled ? 'Mute' : 'Unmute'}
          onClick={handleToggleAudio}
          tooltip={isAudioEnabled ? 'Mute microphone (turn off audio)' : 'Unmute microphone (turn on audio)'}
        />
        
        <IconButton
          icon={isVideoEnabled ? <VideoIcon /> : <VideoOffIcon />}
          variant={isVideoEnabled ? 'primary' : 'danger'}
          size="lg"
          ariaLabel={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          label={isVideoEnabled ? 'Camera' : 'Camera'}
          onClick={handleToggleVideo}
          tooltip={isVideoEnabled ? 'Turn off camera (stop video)' : 'Turn on camera (start video)'}
        />
        
        <IconButton
          icon={isScreenSharing ? <ScreenShareOffIcon /> : <ScreenShareIcon />}
          variant={isScreenSharing ? 'danger' : 'primary'}
          size="lg"
          ariaLabel={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
          label={isScreenSharing ? 'Stop Share' : 'Share'}
          onClick={handleToggleScreenShare}
          tooltip={isScreenSharing ? 'Stop sharing your screen' : 'Share your screen with others'}
        />
        
        <IconButton
          icon={<HandIcon />}
          variant={isHandRaised ? 'success' : 'primary'}
          size="lg"
          ariaLabel={isHandRaised ? 'Lower hand' : 'Raise hand'}
          label={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
          onClick={handleToggleHandRaised}
          isActive={isHandRaised}
          tooltip={isHandRaised ? 'Lower your hand' : 'Raise your hand to get attention'}
        />
      </div>
    </div>
  );
};

export default MediaControls;