import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../../lib/hooks/reduxHooks';
import { setRoomId } from '../../../lib/redux/slices/roomSlice';
import LandingPage from './LandingPage';
import DeviceSetupDialog from './DeviceSetupDialog';
import MeetingUI from './MeetingUI';

// Define the setJoined action
const setJoined = (joined: boolean) => ({
  type: 'room/setJoined',
  payload: joined
});

// Define the setLocalStream action
const setLocalStream = (stream: MediaStream | null) => ({
  type: 'media/setLocalStream',
  payload: stream ? {
    id: stream.id,
    active: stream.active,
    hasAudio: stream.getAudioTracks().length > 0,
    hasVideo: stream.getVideoTracks().length > 0,
    audioEnabled: stream.getAudioTracks().length > 0 ? stream.getAudioTracks()[0].enabled : false,
    videoEnabled: stream.getVideoTracks().length > 0 ? stream.getVideoTracks()[0].enabled : false,
  } : null
});

interface RoomState {
  roomId: string;
  isJoined: boolean;
}

interface UserState {
  userId: string;
  userName: string;
  devicePreferences: DevicePreferences;
}

interface DevicePreferences {
  audioInput: string;
  audioOutput: string;
  videoInput: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
}

enum SetupStage {
  LANDING = 'landing',
  DEVICE_SETUP = 'device_setup',
  MEETING = 'meeting'
}

const VideoConference: React.FC = () => {
  const dispatch = useAppDispatch();
  // Type assertions for Redux state
  const roomId = useAppSelector(state => (state.room as any)?.roomId || '');
  const isJoined = useAppSelector(state => (state.room as any)?.isJoined || false);
  const user = useAppSelector(state => state.user);
  const devicePreferences = useAppSelector(state => (state.user as any)?.devicePreferences || {
    isAudioEnabled: true,
    isVideoEnabled: true
  });
  
  const [setupStage, setSetupStage] = useState<SetupStage>(SetupStage.LANDING);
  
  // Handle query parameters on initial load
  useEffect(() => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const roomParam = urlParams.get('room');
    
    if (roomParam) {
      dispatch(setRoomId(roomParam));
    }
  }, [dispatch]);
  
  useEffect(() => {
    // If already joined and we have room info, go straight to meeting
    if (isJoined && roomId) {
      setSetupStage(SetupStage.MEETING);
    }
  }, [isJoined, roomId]);
  
  // Handle setup stage transitions
  const handleJoinFromLanding = () => {
    setSetupStage(SetupStage.DEVICE_SETUP);
  };
  
  const handleBackFromDeviceSetup = () => {
    setSetupStage(SetupStage.LANDING);
  };
  
  const handleJoinMeeting = () => {
    // Get user media with device preferences
    navigator.mediaDevices.getUserMedia({
      audio: devicePreferences.isAudioEnabled,
      video: devicePreferences.isVideoEnabled
    })
    .then(stream => {
      // Store the local stream in Redux
      dispatch(setLocalStream(stream));
      
      // Update room joining status
      dispatch(setJoined(true));
      
      // Move to meeting UI
      setSetupStage(SetupStage.MEETING);
    })
    .catch(err => {
      console.error('Error getting user media:', err);
      alert('Failed to access camera/microphone. Please check permissions.');
    });
  };
  
  // Render appropriate stage
  switch (setupStage) {
    case SetupStage.LANDING:
      return <LandingPage onJoin={handleJoinFromLanding} />;
    case SetupStage.DEVICE_SETUP:
      return <DeviceSetupDialog onJoin={handleJoinMeeting} onBack={handleBackFromDeviceSetup} />;
    case SetupStage.MEETING:
      return <MeetingUI />;
    default:
      return <LandingPage onJoin={handleJoinFromLanding} />;
  }
};

export default VideoConference;