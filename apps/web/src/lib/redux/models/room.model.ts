// Room and participant related model definitions

/**
 * Participant in a meeting room
 */
export interface Participant {
  id: string;
  name: string;
  role: 'host' | 'participant' | 'guest';
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  joinedAt: string;
  stream?: MediaStream;
  isSpeaking?: boolean;
  lastActive?: number;
}

/**
 * Room state interface
 */
export interface RoomState {
  roomId: string | null;
  roomName: string | null;
  participants: Record<string, Participant>;
  isConnected: boolean;
  isJoined: boolean;
  activeParticipantId: string | null;
  activeSpeakerId: string | null;
  error: string | null;
}