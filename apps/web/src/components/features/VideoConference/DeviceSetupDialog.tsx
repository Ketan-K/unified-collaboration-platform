import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '../../../lib/hooks/reduxHooks';
import Button from '../../ui/Button';
// Import select component from the correct location or create a custom one
import { Select } from '../../ui/Form';
import IconButton from '../../ui/IconButton';
import {
  MicIcon,
  MicOffIcon,
  VideoIcon,
  VideoOffIcon,
} from '../../icons/MediaIcons';

// Add action to set device preferences
const setDevicePreferences = (preferences: DevicePreferences) => {
  return {
    type: 'user/setDevicePreferences',
    payload: preferences
  };
};

interface DeviceSetupDialogProps {
  onJoin: () => void;
  onBack: () => void;
}

interface DeviceOption {
  label: string;
  value: string;
}

// Define device preferences interface
interface DevicePreferences {
  audioInput: string;
  audioOutput: string;
  videoInput: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
}

const DeviceSetupDialog: React.FC<DeviceSetupDialogProps> = ({ onJoin, onBack }) => {
  const dispatch = useAppDispatch();
  const { userName } = useAppSelector(state => state.user);
  // Use type assertion for room state
  const roomId = useAppSelector(state => (state.room as any)?.roomId || '');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioLevelCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioLevelAnimationRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  
  const [audioInputDevices, setAudioInputDevices] = useState<DeviceOption[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<DeviceOption[]>([]);
  const [videoDevices, setVideoDevices] = useState<DeviceOption[]>([]);
  
  const [selectedAudioInput, setSelectedAudioInput] = useState('');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState('');
  const [selectedVideo, setSelectedVideo] = useState('');
  
  // On component mount, get available media devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        // Request permissions first
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        
        // Then enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        const audioInputs = devices
          .filter(device => device.kind === 'audioinput')
          .map(device => ({ label: device.label || 'Microphone', value: device.deviceId }));
        
        const audioOutputs = devices
          .filter(device => device.kind === 'audiooutput')
          .map(device => ({ label: device.label || 'Speaker', value: device.deviceId }));
        
        const cameras = devices
          .filter(device => device.kind === 'videoinput')
          .map(device => ({ label: device.label || 'Camera', value: device.deviceId }));
        
        setAudioInputDevices(audioInputs);
        setAudioOutputDevices(audioOutputs);
        setVideoDevices(cameras);
        
        // Set default devices if available
        if (audioInputs.length > 0) setSelectedAudioInput(audioInputs[0].value);
        if (audioOutputs.length > 0) setSelectedAudioOutput(audioOutputs[0].value);
        if (cameras.length > 0) setSelectedVideo(cameras[0].value);
      } catch (err) {
        console.error('Error accessing media devices:', err);
        setError('Could not access camera or microphone. Please check permissions.');
      }
    };
    
    getDevices();
    
    // Cleanup function
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (audioLevelAnimationRef.current) {
        cancelAnimationFrame(audioLevelAnimationRef.current);
      }
    };
  }, []);
  
  // Initialize media stream when device selection changes
  useEffect(() => {
    const initializeStream = async () => {
      try {
        // Stop any existing tracks
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
        
        // Create constraints based on selected devices
        const constraints: MediaStreamConstraints = {
          audio: selectedAudioInput ? { deviceId: { exact: selectedAudioInput } } : true,
          video: selectedVideo ? { deviceId: { exact: selectedVideo } } : true
        };
        
        // Get new media stream
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        mediaStreamRef.current = stream;
        
        // Set up video preview
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        // Apply initial state
        stream.getAudioTracks().forEach(track => {
          track.enabled = isAudioEnabled;
        });
        
        stream.getVideoTracks().forEach(track => {
          track.enabled = isVideoEnabled;
        });
        
        // Set up audio level visualization
        setupAudioLevelVisualization(stream);
      } catch (err) {
        console.error('Error initializing media stream:', err);
        setError('Could not access selected devices. Please try different ones.');
      }
    };
    
    if (selectedAudioInput || selectedVideo) {
      initializeStream();
    }
  }, [selectedAudioInput, selectedVideo]);
  
  const setupAudioLevelVisualization = (stream: MediaStream) => {
    try {
      // Set up audio analyzer
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyzer = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      microphone.connect(analyzer);
      analyzer.fftSize = 256;
      audioAnalyserRef.current = analyzer;
      
      const canvas = audioLevelCanvasRef.current;
      const canvasCtx = canvas?.getContext('2d');
      
      if (!canvasCtx || !canvas) return;
      
      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      
      const drawAudioLevel = () => {
        if (!isAudioEnabled) {
          // If audio is disabled, clear canvas
          canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
          canvasCtx.fillStyle = '#e5e7eb'; // gray-200
          canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
          audioLevelAnimationRef.current = requestAnimationFrame(drawAudioLevel);
          return;
        }
        
        analyzer.getByteFrequencyData(dataArray);
        
        // Calculate audio level (simple average)
        const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
        const level = Math.min(average / 128, 1); // Normalize between 0 and 1
        
        // Clear canvas
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background
        canvasCtx.fillStyle = '#e5e7eb'; // gray-200
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw level indicator
        const gradient = canvasCtx.createLinearGradient(0, 0, canvas.width * level, 0);
        gradient.addColorStop(0, '#10b981'); // green-500
        gradient.addColorStop(0.6, '#10b981'); // green-500
        gradient.addColorStop(1, '#ef4444'); // red-500
        
        canvasCtx.fillStyle = gradient;
        canvasCtx.fillRect(0, 0, canvas.width * level, canvas.height);
        
        audioLevelAnimationRef.current = requestAnimationFrame(drawAudioLevel);
      };
      
      drawAudioLevel();
    } catch (err) {
      console.error('Error setting up audio visualization:', err);
    }
  };
  
  const handleToggleAudio = () => {
    if (!mediaStreamRef.current) return;
    
    const tracks = mediaStreamRef.current.getAudioTracks();
    if (tracks.length > 0) {
      const newState = !isAudioEnabled;
      tracks[0].enabled = newState;
      setIsAudioEnabled(newState);
    }
  };
  
  const handleToggleVideo = () => {
    if (!mediaStreamRef.current) return;
    
    const tracks = mediaStreamRef.current.getVideoTracks();
    if (tracks.length > 0) {
      const newState = !isVideoEnabled;
      tracks[0].enabled = newState;
      setIsVideoEnabled(newState);
    }
  };
  
  const handleJoinMeeting = () => {
    setIsJoining(true);
    
    // Save device preferences
    dispatch(setDevicePreferences({
      audioInput: selectedAudioInput,
      audioOutput: selectedAudioOutput,
      videoInput: selectedVideo,
      isAudioEnabled,
      isVideoEnabled
    }));
    
    // Store the current media stream to be used in the meeting
    if (mediaStreamRef.current) {
      // We stop the tracks here because the VideoConference component will initialize its own
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    onJoin();
  };

  return (
    <motion.div 
      className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-full max-w-3xl p-8 bg-white dark:bg-gray-800 rounded-xl shadow-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Device Settings</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Configure your camera and microphone before joining
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Video Preview */}
          <div className="rounded-lg overflow-hidden bg-black relative">
            <div className="aspect-w-16 aspect-h-9 w-full">
              {isVideoEnabled ? (
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  <div className="text-center text-gray-400">
                    <VideoOffIcon size={48} />
                    <p className="mt-2">Camera is turned off</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="absolute bottom-4 right-4 flex space-x-2">
              <IconButton
                icon={isVideoEnabled ? <VideoIcon /> : <VideoOffIcon />}
                variant={isVideoEnabled ? 'primary' : 'danger'}
                size="md"
                onClick={handleToggleVideo}
                ariaLabel={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
              />
              <IconButton
                icon={isAudioEnabled ? <MicIcon /> : <MicOffIcon />}
                variant={isAudioEnabled ? 'primary' : 'danger'}
                size="md"
                onClick={handleToggleAudio}
                ariaLabel={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
              />
            </div>
          </div>
          
          {/* Device Selection */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Microphone
              </label>
              <Select
                value={selectedAudioInput}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedAudioInput(e.target.value)}
                options={audioInputDevices}
                disabled={audioInputDevices.length === 0}
                placeholder="Select microphone"
              />
              <div className="mt-2 h-4">
                <canvas 
                  ref={audioLevelCanvasRef}
                  className="w-full h-full rounded-sm" 
                  width={200}
                  height={16}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Speaker
              </label>
              <Select
                value={selectedAudioOutput}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedAudioOutput(e.target.value)}
                options={audioOutputDevices}
                disabled={audioOutputDevices.length === 0}
                placeholder="Select speaker"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Camera
              </label>
              <Select
                value={selectedVideo}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedVideo(e.target.value)}
                options={videoDevices}
                disabled={videoDevices.length === 0}
                placeholder="Select camera"
              />
            </div>
            
            {error && (
              <div className="p-3 rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100">
                {error}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-between mt-8">
          <Button
            variant="secondary"
            onClick={onBack}
            isDisabled={isJoining}
          >
            Back
          </Button>
          
          <Button
            variant="primary"
            onClick={handleJoinMeeting}
            isLoading={isJoining}
            isDisabled={isJoining}
          >
            Join as {userName}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default DeviceSetupDialog;