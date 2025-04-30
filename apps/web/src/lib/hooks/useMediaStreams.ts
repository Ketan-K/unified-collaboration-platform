import { useCallback } from 'react';
import { useAppAction, useAppSelector } from './reduxHooks';
import { selectLocalParticipant } from '../redux/selectors';
import { updateParticipant } from '../redux/slices/roomSlice';
import { updateDevicePreferences } from '../redux/slices/userSlice';

/**
 * Hook for managing media streams (camera, microphone, screen share)
 */
export const useMediaStreams = () => {
  const localParticipant = useAppSelector(selectLocalParticipant);
  
  const updateParticipantAction = useAppAction(updateParticipant);
  const updateDevicePreferencesAction = useAppAction(updateDevicePreferences);

  /**
   * Toggle audio enabled/disabled
   */
  const toggleAudio = useCallback(async () => {
    if (!localParticipant) return;
    
    const newState = !localParticipant.isAudioEnabled;
    
    // Update local participant in room state
    updateParticipantAction({
      id: localParticipant.id,
      isAudioEnabled: newState,
    });
    
    // Update user preferences
    updateDevicePreferencesAction({
      isAudioEnabled: newState,
    });
    
    // Here you would also update the actual media tracks
    if (localParticipant.stream) {
      localParticipant.stream.getAudioTracks().forEach(track => {
        track.enabled = newState;
      });
    }
  }, [localParticipant, updateParticipantAction, updateDevicePreferencesAction]);

  /**
   * Toggle video enabled/disabled
   */
  const toggleVideo = useCallback(async () => {
    if (!localParticipant) return;
    
    const newState = !localParticipant.isVideoEnabled;
    
    // Update local participant in room state
    updateParticipantAction({
      id: localParticipant.id,
      isVideoEnabled: newState,
    });
    
    // Update user preferences
    updateDevicePreferencesAction({
      isVideoEnabled: newState,
    });
    
    // Here you would also update the actual media tracks
    if (localParticipant.stream) {
      localParticipant.stream.getVideoTracks().forEach(track => {
        track.enabled = newState;
      });
    }
  }, [localParticipant, updateParticipantAction, updateDevicePreferencesAction]);

  /**
   * Toggle screen sharing on/off
   */
  const toggleScreenShare = useCallback(async () => {
    if (!localParticipant) return;
    
    const isCurrentlySharing = localParticipant.isScreenSharing;
    
    if (isCurrentlySharing) {
      // Stop screen sharing
      updateParticipantAction({
        id: localParticipant.id,
        isScreenSharing: false,
      });
      
      // Here you would handle the actual screen share stream
    } else {
      try {
        // Request screen share
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        
        // Update participant state
        updateParticipantAction({
          id: localParticipant.id,
          isScreenSharing: true,
        });
        
        // Here you would handle the actual screen share stream
        
        // Add event listener for when user stops sharing via browser UI
        screenStream.getVideoTracks()[0].onended = () => {
          updateParticipantAction({
            id: localParticipant.id,
            isScreenSharing: false,
          });
        };
      } catch (error) {
        console.error("Error starting screen share:", error);
      }
    }
  }, [localParticipant, updateParticipantAction]);

  /**
   * Change audio input device
   */
  const changeAudioInputDevice = useCallback(async (deviceId: string) => {
    // Update user preferences
    updateDevicePreferencesAction({
      audioInput: deviceId,
    });
    
    // Here you would handle actually changing the device
  }, [updateDevicePreferencesAction]);

  /**
   * Change video input device
   */
  const changeVideoInputDevice = useCallback(async (deviceId: string) => {
    // Update user preferences
    updateDevicePreferencesAction({
      videoInput: deviceId,
    });
    
    // Here you would handle actually changing the device
  }, [updateDevicePreferencesAction]);

  /**
   * Change audio output device
   */
  const changeAudioOutputDevice = useCallback(async (deviceId: string) => {
    // Update user preferences
    updateDevicePreferencesAction({
      audioOutput: deviceId,
    });
    
    // Here you would handle actually changing the device
  }, [updateDevicePreferencesAction]);

  return {
    isAudioEnabled: localParticipant?.isAudioEnabled ?? false,
    isVideoEnabled: localParticipant?.isVideoEnabled ?? false,
    isScreenSharing: localParticipant?.isScreenSharing ?? false,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    changeAudioInputDevice,
    changeVideoInputDevice,
    changeAudioOutputDevice,
  };
};

export default useMediaStreams;