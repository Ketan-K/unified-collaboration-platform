import React, { useRef, useEffect, useState } from 'react';
import { useMedia } from './providers/MediaProvider';
import mediaService from '../../../utils/media/mediaService';

/**
 * A simple component that directly renders the local video stream without complex state management
 */
const DirectVideoRenderer: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const { localStream } = useMedia();
  
  // Connect any available stream to the video element
  useEffect(() => {
    // First try the provider stream
    let streamToUse = localStream;
    
    // If that's not available, try getting it directly from the service
    if (!streamToUse) {
      streamToUse = mediaService.getLocalStream();
    }
    
    // If we have a stream and video element, connect them
    if (streamToUse && videoRef.current) {
      console.log("DirectVideoRenderer: Connecting stream to video element");
      
      // Connect the stream
      videoRef.current.srcObject = streamToUse;
      
      // Try to play the video
      videoRef.current.play()
        .then(() => {
          setVideoReady(true);
        })
        .catch((err) => {
          console.error("DirectVideoRenderer: Error playing video:", err);
          // Try again with a delay
          setTimeout(() => {
            videoRef.current?.play().catch(e => 
              console.error("DirectVideoRenderer: Second attempt failed:", e)
            );
          }, 1000);
        });
    }
  }, [localStream]);
  
  return (
    <div className="h-full w-full bg-gray-900 relative">
      {/* The video element always takes the full container */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      
      {/* Only show loading indicator if video is not ready */}
      {!videoReady && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <div className="space-y-3 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent mx-auto"></div>
            <div>Loading video...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectVideoRenderer;