import socketService from "../socket/socketService";
import webRTCService from "../socket/webRTCService";

/**
 * Service responsible for managing media streams (audio, video, screen sharing)
 */
class MediaService {
  private audioStream: MediaStream | null = null;
  private videoStream: MediaStream | null = null;
  private screenShareStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private audioAnalyzer: AnalyserNode | null = null;
  private audioAnalyzerActive: boolean = false;
  private activeSpeakerCallback: ((userId: string | null) => void) | null = null;
  
  /**
   * Initialize audio stream separately
   */
  async initializeAudioStream(enabled: boolean = true): Promise<MediaStream | null> {
    try {
      // Stop any existing audio tracks first
      this.stopAudioTracks();
      
      if (!enabled) {
        return null;
      }
      
      // Create a new stream with only audio
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioStream = stream;
      
      // Ensure tracks are enabled
      stream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
      
      // Make audio stream available to WebRTC service through socketService
      socketService.setAudioStream(stream);
      
      // Setup audio analyzer
      this.setupAudioAnalyzer(stream);
      
      return stream;
    } catch (error) {
      console.error('Error initializing audio stream:', error);
      return null;
    }
  }

  /**
   * Initialize video stream separately
   */
  async initializeVideoStream(enabled: boolean = true): Promise<MediaStream | null> {
    try {
      // Stop any existing video tracks first
      this.stopVideoTracks();
      
      if (!enabled) {
        return null;
      }
      
      // Create a new stream with only video
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.videoStream = stream;
      
      // Ensure tracks are enabled
      stream.getVideoTracks().forEach(track => {
        track.enabled = true;
        console.log("Video track enabled:", track.enabled, "ID:", track.id, "State:", track.readyState);
      });
      
      // Make video stream available to WebRTC service through socketService
      socketService.setVideoStream(stream);
      
      return stream;
    } catch (error) {
      console.error('Error initializing video stream:', error);
      return null;
    }
  }

  /**
   * Initialize both audio and video streams (for backward compatibility)
   */
  async initializeLocalStream(options: { audio: boolean, video: boolean } = { audio: true, video: true }): Promise<MediaStream | null> {
    try {
      // Initialize audio and video separately
      let audioResult = null;
      let videoResult = null;
      
      if (options.audio) {
        audioResult = await this.initializeAudioStream(true);
      } else {
        this.stopAudioTracks();
      }
      
      if (options.video) {
        videoResult = await this.initializeVideoStream(true);
      } else {
        this.stopVideoTracks();
      }
      
      // For backward compatibility, return a combined stream if needed
      return this.getCombinedStream();
    } catch (error) {
      console.error('Error initializing local streams:', error);
      return null;
    }
  }

  /**
   * Get the current audio stream
   */
  getAudioStream(): MediaStream | null {
    return this.audioStream;
  }
  
  /**
   * Get the current video stream
   */
  getVideoStream(): MediaStream | null {
    return this.videoStream;
  }
  
  /**
   * Get a combined stream (for backward compatibility)
   */
  getCombinedStream(): MediaStream | null {
    // If neither stream exists, return null
    if (!this.audioStream && !this.videoStream) {
      return null;
    }
    
    // Create a new combined stream
    const combinedStream = new MediaStream();
    
    // Add audio tracks if available
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => {
        combinedStream.addTrack(track);
      });
    }
    
    // Add video tracks if available
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => {
        combinedStream.addTrack(track);
      });
    }
    
    return combinedStream;
  }
  
  /**
   * Get the current local stream (for backward compatibility)
   */
  getLocalStream(): MediaStream | null {
    return this.getCombinedStream();
  }
  
  /**
   * Update the audio stream's state
   */
  async toggleAudio(enable: boolean): Promise<boolean> {
    // Handle case where we need to initialize audio
    if (!this.audioStream && enable) {
      const newStream = await this.initializeAudioStream(true);
      return !!newStream;
    }
    
    // Handle existing stream case
    if (this.audioStream) {
      const audioTracks = this.audioStream.getAudioTracks();
      
      if (audioTracks.length > 0) {
        if (!enable) {
          // If disabling, first disable all audio tracks
          audioTracks.forEach(track => {
            track.enabled = false;
          });
          
          // Cleanup audio analyzer to stop processing audio levels
          this.stopAudioAnalyzer();
          
          return false;
        } else {
          // Check if tracks are already enabled
          const allDisabled = audioTracks.every(track => !track.enabled);
          const allStopped = audioTracks.every(track => track.readyState === 'ended');
          
          if (allStopped) {
            // All tracks were actually stopped, need to recreate
            return this.initializeAudioStream(true) !== null;
          } else if (allDisabled) {
            // Tracks are just disabled, not stopped - just enable them
            audioTracks.forEach(track => {
              track.enabled = true;
            });
            
            // Re-setup audio analyzer to resume audio level detection
            this.setupAudioAnalyzer(this.audioStream);
            
            return true;
          } else {
            // Tracks are already enabled
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  /**
   * Update the video stream's state
   */
  async toggleVideo(enable: boolean): Promise<boolean> {
    console.log(`toggleVideo called with enable=${enable}`);
    
    // Handle case where we need to initialize video
    if (!this.videoStream && enable) {
      console.log("No video stream, initializing new video stream");
      const newStream = await this.initializeVideoStream(true);
      return !!newStream;
    }
    
    // Special case: If we're trying to disable but there's no stream, just return successful disable
    if (!this.videoStream && !enable) {
      console.log("No video stream to disable, returning success");
      return true;
    }
    
    // Handle existing stream case
    if (this.videoStream) {
      const videoTracks = this.videoStream.getVideoTracks();
      console.log(`Video stream has ${videoTracks.length} video tracks`);
      
      if (videoTracks.length > 0) {
        if (!enable) {
          // If disabling video, completely stop and remove all video tracks
          console.log("Disabling and stopping video tracks to free camera");
          this.stopVideoTracks();
          
          return false;
        } else {
          // If video tracks are already enabled, do nothing
          if (videoTracks.every(track => track.enabled && track.readyState === 'live')) {
            return true;
          }
          
          // Otherwise, reinitialize video
          return this.initializeVideoStream(true) !== null;
        }
      } else if (enable) {
        // No video tracks but we want to enable video
        return this.initializeVideoStream(true) !== null;
      }
    }
    
    return false;
  }
  
  /**
   * Toggle screen sharing
   */
  async toggleScreenShare(): Promise<{ active: boolean, stream: MediaStream | null }> {
    try {
      if (this.screenShareStream) {
        // Stop screen sharing
        this.screenShareStream.getTracks().forEach(track => track.stop());
        this.screenShareStream = null;
        socketService.setScreenStream(null);
        return { active: false, stream: null };
      } else {
        // Start screen sharing
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true,
          audio: true 
        });
        
        // Store the stream
        this.screenShareStream = stream;
        
        // Set up automatic handling for when user stops sharing via browser UI
        stream.getVideoTracks()[0].onended = () => {
          this.screenShareStream = null;
          socketService.setScreenStream(null);
        };
        
        // Make screen stream available to WebRTC service through socketService
        socketService.setScreenStream(stream);
        
        return { active: true, stream };
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      return { active: false, stream: null };
    }
  }
  
  /**
   * Get the current screen share stream
   */
  getScreenShareStream(): MediaStream | null {
    return this.screenShareStream;
  }
  
  /**
   * Set up audio level analyzer
   */
  private setupAudioAnalyzer(stream: MediaStream) {
    try {
      const audioTracks = stream.getAudioTracks();
      // Don't set up analyzer if no audio tracks or they're all disabled
      if (audioTracks.length === 0 || audioTracks.every(track => !track.enabled)) {
        return;
      }
      
      // Clean up any existing analyzer
      this.stopAudioAnalyzer();
      
      // Create new audio context and analyzer
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.audioAnalyzer = this.audioContext.createAnalyser();
      const microphone = this.audioContext.createMediaStreamSource(stream);
      
      // Configure analyzer
      this.audioAnalyzer.fftSize = 2048;
      this.audioAnalyzer.smoothingTimeConstant = 0.8;
      microphone.connect(this.audioAnalyzer);
      
      // Create a buffer to read audio levels
      const dataArray = new Uint8Array(this.audioAnalyzer.frequencyBinCount);
      
      // Track latest audio level
      let latestAudioLevel = 0;
      
      // Start audio analysis
      this.audioAnalyzerActive = true;
      
      // Store timeout/interval IDs for cleanup
      let animationFrameId: number;
      let silenceCheckIntervalId: number;
      
      // Define audio processing function
      const processAudio = () => {
        if (!this.audioAnalyzerActive || !this.audioAnalyzer) return;
        
        // Check if all audio tracks are disabled - if so, don't process audio
        if (audioTracks.every(track => !track.enabled || track.readyState !== 'live')) {
          // Don't continue processing if audio is muted or tracks are ended
          latestAudioLevel = 0;
          return;
        }
        
        // Get frequency data
        this.audioAnalyzer.getByteFrequencyData(dataArray);
        
        // Calculate average level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        latestAudioLevel = sum / dataArray.length;
        
        // If average is above threshold, mark as active speaker
        if (latestAudioLevel > 20 && this.activeSpeakerCallback) {
          // Use callback to notify components about active speaker
          // We need the actual user ID from the component
          this.activeSpeakerCallback('local');
        }
        
        // Continue processing
        animationFrameId = requestAnimationFrame(processAudio);
      };
      
      // Start audio processing
      animationFrameId = requestAnimationFrame(processAudio);
      
      // Set interval to check for silence
      silenceCheckIntervalId = window.setInterval(() => {
        if (!this.audioAnalyzerActive) {
          // Clean up the interval if analyzer is no longer active
          clearInterval(silenceCheckIntervalId);
          return;
        }
        
        // Check if all audio tracks are disabled or we have low audio level
        if (audioTracks.every(track => !track.enabled) || latestAudioLevel < 10) {
          if (this.activeSpeakerCallback) {
            this.activeSpeakerCallback(null);
          }
        }
      }, 2000);
      
      // Store the IDs for cleanup
      (this as any)._animationFrameId = animationFrameId;
      (this as any)._silenceCheckIntervalId = silenceCheckIntervalId;
      
    } catch (error) {
      console.error('Error setting up audio analyzer:', error);
    }
  }
  
  /**
   * Stop and clean up audio analyzer
   */
  private stopAudioAnalyzer() {
    this.audioAnalyzerActive = false;
    
    // Cancel animation frame if it exists
    if ((this as any)._animationFrameId) {
      cancelAnimationFrame((this as any)._animationFrameId);
      (this as any)._animationFrameId = undefined;
    }
    
    // Clear interval if it exists
    if ((this as any)._silenceCheckIntervalId) {
      clearInterval((this as any)._silenceCheckIntervalId);
      (this as any)._silenceCheckIntervalId = undefined;
    }
    
    // Reset speaking state
    if (this.activeSpeakerCallback) {
      this.activeSpeakerCallback(null);
    }
    
    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }
    
    this.audioAnalyzer = null;
  }
  
  /**
   * Set a callback for active speaker detection
   */
  setActiveSpeakerCallback(callback: (userId: string | null) => void) {
    this.activeSpeakerCallback = callback;
  }
  
  /**
   * Stop audio tracks and release resources
   */
  stopAudioTracks() {
    if (this.audioStream) {
      console.log("Stopping all audio tracks to ensure resources are released");
      this.audioStream.getTracks().forEach(track => {
        console.log(`Stopping audio track: ID: ${track.id}`);
        track.stop();
      });
      this.audioStream = null;
      socketService.setAudioStream(null);
    }
    
    // Clean up audio analyzer
    this.stopAudioAnalyzer();
  }
  
  /**
   * Stop video tracks and release resources
   */
  stopVideoTracks() {
    if (this.videoStream) {
      console.log("Stopping all video tracks to ensure resources are released");
      this.videoStream.getVideoTracks().forEach(track => {
        console.log(`Stopping video track: ID: ${track.id}`);
        track.stop();
      });
      this.videoStream = null;
      socketService.setVideoStream(null);
    }
  }
  
  /**
   * Stop all tracks in local streams and release resources (for backward compatibility)
   */
  stopLocalTracks() {
    this.stopAudioTracks();
    this.stopVideoTracks();
  }
  
  /**
   * Clean up all resources - make sure this is called when leaving rooms
   * or when the application is closed
   */
  cleanup() {
    console.log("Performing complete media cleanup");
    
    // Stop all tracks
    this.stopAudioTracks();
    this.stopVideoTracks();
    
    // Stop screen sharing
    if (this.screenShareStream) {
      this.screenShareStream.getTracks().forEach(track => {
        track.stop();
      });
      this.screenShareStream = null;
      socketService.setScreenStream(null);
    }
    
    // Ensure WebRTC service also cleans up its resources
    webRTCService.cleanup();
  }
}

// Export a singleton instance
const mediaService = new MediaService();
export default mediaService;