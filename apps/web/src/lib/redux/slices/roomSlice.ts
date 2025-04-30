import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import { Participant, RoomState } from '../models/room.model';

// Initial state
const initialState: RoomState = {
  roomId: null,
  roomName: null,
  participants: {},
  isConnected: false,
  isJoined: false,
  activeParticipantId: null,
  activeSpeakerId: null,
  error: null,
};

// Create the room slice
export const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    // Set room data when joining a room
    setRoomData: (state, action: PayloadAction<{ roomId: string; roomName: string }>) => {
      state.roomId = action.payload.roomId;
      state.roomName = action.payload.roomName;
      state.isJoined = true;
    },
    
    // Set just the room ID
    setRoomId: (state, action: PayloadAction<string>) => {
      state.roomId = action.payload;
    },
    
    // Set joined status
    setJoined: (state, action: PayloadAction<boolean>) => {
      state.isJoined = action.payload;
    },
    
    // Add a participant to the room
    addParticipant: (state, action: PayloadAction<Participant>) => {
      state.participants[action.payload.id] = action.payload;
      
      // If this is the first participant, make them active
      if (Object.keys(state.participants).length === 1) {
        state.activeParticipantId = action.payload.id;
      }
    },
    
    // Remove a participant from the room
    removeParticipant: (state, action: PayloadAction<string>) => {
      const participantId = action.payload;
      delete state.participants[participantId];
      
      // If the active participant was removed, set a new active participant
      if (state.activeParticipantId === participantId) {
        const remainingParticipants = Object.keys(state.participants);
        state.activeParticipantId = remainingParticipants.length > 0 
          ? remainingParticipants[0] 
          : null;
      }
      
      // If active speaker was removed, clear it
      if (state.activeSpeakerId === participantId) {
        state.activeSpeakerId = null;
      }
    },
    
    // Update participant properties
    updateParticipant: (state, action: PayloadAction<Partial<Participant> & { id: string }>) => {
      const { id, ...updates } = action.payload;
      
      if (state.participants[id]) {
        state.participants[id] = {
          ...state.participants[id],
          ...updates,
        };
      }
    },
    
    // Set active participant (e.g., when they're sharing screen)
    setActiveParticipant: (state, action: PayloadAction<string>) => {
      state.activeParticipantId = action.payload;
    },
    
    // Set active speaker (the participant who's currently speaking)
    setActiveSpeaker: (state, action: PayloadAction<string | null>) => {
      state.activeSpeakerId = action.payload;
    },
    
    // Set connection status
    setConnectionStatus: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
    
    // Clear room state when leaving
    leaveRoom: (state) => {
      return initialState;
    },
    
    // Set error message
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    
    // Clear error message
    clearError: (state) => {
      state.error = null;
    },
  },
});

// Export actions
export const {
  setRoomData,
  setRoomId,
  setJoined,
  addParticipant,
  removeParticipant,
  updateParticipant,
  setActiveParticipant,
  setActiveSpeaker,
  setConnectionStatus,
  leaveRoom,
  setError,
  clearError,
} = roomSlice.actions;

export default roomSlice.reducer;