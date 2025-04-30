import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../../lib/hooks/reduxHooks';
import VideoGrid from './VideoGrid';
import MediaControls from './MediaControls';
import ChatComponent from '../Chat/ChatComponent';
// import CodeEditor from '../CodeEditor/CodeEditor';
import ParticipantsList from './ParticipantsList';
import { 
  ChatIcon, 
  ParticipantsIcon, 
  WhiteboardIcon, 
  CodeIcon,
  SettingsIcon,
  LeaveIcon 
} from '../../icons/MediaIcons';
import { openModal } from '../../../lib/redux/slices/uiSlice';
import { addParticipant } from '../../../lib/redux/slices/roomSlice';
import socketService from '../../../utils/socket/socketService';
import MediaProvider, { useMedia } from './providers/MediaProvider';

type ContentTab = 'video' | 'chat' | 'participants' | 'whiteboard' | 'codeEditor';

// Separate component for meeting content that uses MediaProvider context
const MeetingContent: React.FC = () => {
  const dispatch = useAppDispatch();
  const roomId = useAppSelector(state => state.room.roomId || '');
  const userId = useAppSelector(state => state.user?.userId || '');
  const userName = useAppSelector(state => state.user?.userName || 'Anonymous');
  const isConnected = useAppSelector(state => state.room.isConnected);
  const isJoined = useAppSelector(state => state.room.isJoined);
  const chatUnreadCount = useAppSelector(state => state.chat?.unreadCount || 0);
  
  // Get media state from context
  const { 
    localStream,
    toggleAudio, 
    toggleVideo, 
    toggleScreenShare 
  } = useMedia();
  
  const [activeTab, setActiveTab] = useState<ContentTab>('video');
  const [isJoining, setIsJoining] = useState(false);

  // Handle joining the room
  useEffect(() => {
    if (!isJoined && roomId && userId && !isJoining && localStream) {
      const joinRoom = async () => {
        setIsJoining(true);
        try {
          // Make sure we're connected to socket
          if (!isConnected) {
            await socketService.connect();
          }
          
          // Check if the local stream has active video tracks
          const videoTracks = localStream.getVideoTracks();
          const hasVideoEnabled = videoTracks.some(track => track.enabled && track.readyState === 'live');
          console.log("MeetingUI Join: Local stream video tracks:", 
            videoTracks.map(t => `${t.id}: enabled=${t.enabled}, state=${t.readyState}`));
          
          // Add local participant to the room
          dispatch(addParticipant({
            id: userId,
            name: userName,
            role: 'participant',
            isAudioEnabled: true,
            isVideoEnabled: hasVideoEnabled, // Set based on actual track state
            isScreenSharing: false,
            isHandRaised: false,
            joinedAt: new Date().toISOString(),
            stream: localStream
          }));
          console.log("MeetingUI: Local participant added to Redux", userId, userName);
          
        } catch (error) {
          console.error('Error joining meeting:', error);
        } finally {
          setIsJoining(false);
        }
      };
      
      joinRoom();
    }
  }, [isJoined, roomId, userId, isJoining, localStream, isConnected, dispatch, userName]);

  const handleTabChange = (tab: ContentTab) => {
    setActiveTab(tab);
  };
  
  const openSettings = () => {
    dispatch(openModal({ type: 'settings' }));
  };
  
  const leaveMeeting = () => {
    dispatch(openModal({
      type: 'error',
      data: {
        title: 'Leave Meeting',
        message: 'Are you sure you want to leave this meeting?',
        confirmText: 'Leave',
        cancelText: 'Stay',
        onConfirm: () => {
          window.location.href = '/';
        }
      }
    }));
  };
  
  // Clipboard handling function
  const copyMeetingLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('code', roomId);
    
    // Copy to clipboard
    navigator.clipboard.writeText(url.toString())
      .then(() => {
        // Show toast notification
        dispatch(openModal({
          type: 'info',
          data: {
            title: 'Link Copied',
            message: 'Meeting link copied to clipboard',
            autoClose: true,
            duration: 2000
          }
        }));
      })
      .catch(err => {
        console.error('Failed to copy meeting link:', err);
      });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'video':
        return <VideoGrid />;
      case 'chat':
        return <ChatComponent />;
      case 'participants':
        return <ParticipantsList />;
      case 'whiteboard':
        return <></>;
      case 'codeEditor':
        return <></>;
      default:
        return <VideoGrid />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="h-14 bg-white dark:bg-gray-800 shadow-sm flex items-center justify-between px-4 z-10">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Meeting: {roomId}</h1>
          <button 
            onClick={copyMeetingLink}
            className="ml-4 text-sm flex items-center px-2 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-200 rounded-md"
            aria-label="Copy meeting link"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copy Link</span>
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={openSettings}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Settings"
          >
            <SettingsIcon size={20} />
          </button>
          <button
            onClick={leaveMeeting}
            className="flex items-center px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md"
            aria-label="Leave meeting"
          >
            <LeaveIcon size={16} className="mr-1.5" />
            <span>Leave</span>
          </button>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left sidebar with tabs */}
        <nav className="w-16 bg-white dark:bg-gray-800 shadow-md flex flex-col items-center py-4">
          <div className="flex flex-col items-center space-y-8">
            <button
              onClick={() => handleTabChange('video')}
              className={`p-3 rounded-lg ${activeTab === 'video' 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              aria-label="Video"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="10" rx="2" ry="2"></rect>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
            
            <button
              onClick={() => handleTabChange('chat')}
              className={`p-3 rounded-lg relative ${activeTab === 'chat' 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              aria-label="Chat"
            >
              <ChatIcon size={24} />
              {chatUnreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                  {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                </span>
              )}
            </button>
            
            <button
              onClick={() => handleTabChange('participants')}
              className={`p-3 rounded-lg ${activeTab === 'participants' 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              aria-label="Participants"
            >
              <ParticipantsIcon size={24} />
            </button>
            
            <button
              onClick={() => handleTabChange('whiteboard')}
              className={`p-3 rounded-lg ${activeTab === 'whiteboard' 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              aria-label="Whiteboard"
            >
              <WhiteboardIcon size={24} />
            </button>
            
            <button
              onClick={() => handleTabChange('codeEditor')}
              className={`p-3 rounded-lg ${activeTab === 'codeEditor' 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              aria-label="Code Editor"
            >
              <CodeIcon size={24} />
            </button>
          </div>
        </nav>
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
          <div className="flex-1 overflow-hidden relative">
            {renderTabContent()}
          </div>
        </div>
      </main>
      
      {/* Media controls at bottom */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <MediaControls 
          localStream={localStream}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={toggleScreenShare}
          onToggleFeature={(feature) => {
            switch (feature) {
              case 'chat':
                handleTabChange('chat');
                break;
              case 'participants':
                handleTabChange('participants');
                break;
              case 'whiteboard':
                handleTabChange('whiteboard');
                break;
              case 'codeEditor':
                handleTabChange('codeEditor');
                break;
            }
          }} 
        />
      </div>
      
      {/* If not joined, show connecting overlay */}
      {!isJoined && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-20">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Connecting to Meeting</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Setting up your camera and microphone...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Wrap the component with MediaProvider
const MeetingUI: React.FC = () => {
  // Get roomId at this level so we can pass it to MediaProvider
  const roomId = useAppSelector(state => state.room.roomId || '');
  
  return (
    <MediaProvider roomId={roomId}>
      <MeetingContent />
    </MediaProvider>
  );
};

export default MeetingUI;