import { useMemo } from 'react';
import { useAppSelector } from './reduxHooks';
import {
  selectParticipants,
  selectParticipantsForList,
  selectParticipantsWithAudio,
  selectParticipantsWithVideo,
  selectScreenShareParticipant,
  selectActiveSpeaker,
  selectLocalParticipant,
  selectIsCurrentUserHost,
  selectParticipantCount,
} from '../redux/selectors';
import { Participant } from '../redux/models/room.model';

type ParticipantFilterFunction = (participant: Participant) => boolean;

/**
 * Custom hook for accessing and filtering participants data with memoization
 * to prevent unnecessary re-renders
 */
export const useParticipants = () => {
  // Use memoized selectors to prevent re-renders
  const allParticipants = useAppSelector(selectParticipants);
  const participantsForList = useAppSelector(selectParticipantsForList);
  const participantsWithAudio = useAppSelector(selectParticipantsWithAudio);
  const participantsWithVideo = useAppSelector(selectParticipantsWithVideo);
  const screenShareParticipant = useAppSelector(selectScreenShareParticipant);
  const activeSpeaker = useAppSelector(selectActiveSpeaker);
  const localParticipant = useAppSelector(selectLocalParticipant);
  const isHost = useAppSelector(selectIsCurrentUserHost);
  const count = useAppSelector(selectParticipantCount);

  /**
   * Filter participants with custom filter function
   * Result is memoized to prevent unnecessary re-renders
   */
  const filterParticipants = (filterFn: ParticipantFilterFunction) => {
    return useMemo(() => {
      return allParticipants.filter(filterFn);
    }, [allParticipants, filterFn]);
  };

  /**
   * Get a specific participant by ID
   * Result is memoized to prevent unnecessary re-renders
   */
  const getParticipantById = (participantId: string | undefined | null) => {
    return useMemo(() => {
      if (!participantId) return null;
      return allParticipants.find(p => p.id === participantId) || null;
    }, [allParticipants, participantId]);
  };

  return {
    // Direct access to memoized selectors
    allParticipants,
    participantsForList, // Optimized for participant list rendering
    participantsWithAudio,
    participantsWithVideo,
    screenShareParticipant,
    activeSpeaker,
    localParticipant,
    isHost,
    count,
    
    // Helper functions
    filterParticipants,
    getParticipantById,
    
    // Derived values
    hasActiveScreenShare: !!screenShareParticipant,
    isSpeaking: !!activeSpeaker,
  };
};

export default useParticipants;