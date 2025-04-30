import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './store';
import { Participant } from './models/room.model';

// Basic selectors
export const selectRoom = (state: RootState) => state.room;
export const selectUser = (state: RootState) => state.user;

// Participant selectors
export const selectParticipants = (state: RootState) => {
  const participants = state.room.participants;
  return Object.values(participants);
};

// Optimized list of participants for rendering in participant panels
export const selectParticipantsForList = createSelector(
  [selectParticipants],
  (participants) => participants.sort((a, b) => {
    // Sort by role: hosts first, then participants, then guests
    const roleOrder = { host: 0, participant: 1, guest: 2 };
    return roleOrder[a.role] - roleOrder[b.role];
  })
);

// Participants with audio enabled
export const selectParticipantsWithAudio = createSelector(
  [selectParticipants],
  (participants) => participants.filter(p => p.isAudioEnabled)
);

// Participants with video enabled
export const selectParticipantsWithVideo = createSelector(
  [selectParticipants],
  (participants) => participants.filter(p => p.isVideoEnabled)
);

// Find a participant who is currently screen sharing
export const selectScreenShareParticipant = createSelector(
  [selectParticipants],
  (participants) => participants.find(p => p.isScreenSharing) || null
);

// Current active speaker based on audio levels
export const selectActiveSpeaker = createSelector(
  [selectRoom],
  (room) => {
    if (room.activeSpeakerId && room.participants[room.activeSpeakerId]) {
      return room.participants[room.activeSpeakerId];
    }
    return null;
  }
);

// Local participant (current user)
export const selectLocalParticipant = createSelector(
  [selectRoom, selectUser],
  (room, user) => {
    if (!user.userId) return null;
    return room.participants[user.userId] || null;
  }
);

// Check if current user is the host
export const selectIsCurrentUserHost = createSelector(
  [selectLocalParticipant],
  (localParticipant) => localParticipant?.role === 'host'
);

// Total participant count
export const selectParticipantCount = createSelector(
  [selectParticipants],
  (participants) => participants.length
);

// Get participant by ID selector factory
export const makeSelectParticipantById = (participantId: string) => 
  createSelector(
    [(state: RootState) => state.room.participants],
    (participants) => participants[participantId] || null
  );