import React, { memo, useMemo } from 'react';
import { useParticipants } from '../../../lib/hooks/useParticipants';
import { selectUserId } from '../../../lib/redux/slices/userSlice';
import { useAppSelectorWithShallowEqual } from '../../../lib/hooks/reduxHooks';
import { 
  MicIcon, 
  MicOffIcon, 
  VideoIcon, 
  VideoOffIcon,
  ScreenShareIcon,
  HandIcon
} from '../../icons/MediaIcons';

/**
 * Single participant item - memoized to prevent unnecessary re-renders
 */
const ParticipantItem = memo(({ 
  participant, 
  isLocal 
}: { 
  participant: {
    id: string;
    name: string;
    role?: string;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isScreenSharing: boolean;
    isHandRaised: boolean;
  };
  isLocal: boolean;
}) => {
  return (
    <div 
      className={`flex items-center justify-between p-3 ${
        isLocal ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-gray-50 dark:bg-gray-700/30'
      } rounded-lg`}
    >
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
          <span className="text-gray-800 dark:text-white font-medium">
            {participant.name.substring(0, 1).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {participant.name} {isLocal && "(You)"}
          </p>
          {participant.role === 'host' && (
            <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded">
              Host
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {participant.isHandRaised && (
          <span className="text-yellow-500 dark:text-yellow-400">
            <HandIcon size={16} />
          </span>
        )}
        
        {participant.isScreenSharing && (
          <span className="text-blue-500 dark:text-blue-400">
            <ScreenShareIcon size={16} />
          </span>
        )}
        
        <span className={participant.isAudioEnabled ? "text-green-500" : "text-red-500"}>
          {participant.isAudioEnabled ? <MicIcon size={16} /> : <MicOffIcon size={16} />}
        </span>
        
        <span className={participant.isVideoEnabled ? "text-green-500" : "text-red-500"}>
          {participant.isVideoEnabled ? <VideoIcon size={16} /> : <VideoOffIcon size={16} />}
        </span>
      </div>
    </div>
  );
});

// Ensure display name is set for dev tools
ParticipantItem.displayName = 'ParticipantItem';

/**
 * Empty state component for when there are no participants
 */
const EmptyParticipantsList = memo(() => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <p className="text-gray-500 dark:text-gray-400 mb-2">No participants yet</p>
    <p className="text-sm text-gray-400 dark:text-gray-500">
      Share the meeting link to invite others
    </p>
  </div>
));

EmptyParticipantsList.displayName = 'EmptyParticipantsList';

/**
 * Participants list component with optimized rendering
 * Uses custom hooks and memo to prevent unnecessary re-renders
 */
const ParticipantsList: React.FC = () => {
  // Use our custom hook that provides memoized participant data
  const { participantsForList, count } = useParticipants();
  
  // Use shallow equality check for userId to prevent re-renders
  const userId = useAppSelectorWithShallowEqual(selectUserId);
  
  return (
    <div className="h-full flex flex-col p-4 overflow-hidden bg-white dark:bg-gray-800">
      <div className="mb-4 border-b border-gray-200 dark:border-gray-700 pb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          Participants ({count})
        </h2>
      </div>
      
      <div className="overflow-y-auto flex-grow pr-2 -mr-2">
        <div className="space-y-2">
          {participantsForList.length > 0 ? (
            participantsForList.map(participant => (
              <ParticipantItem
                key={participant.id}
                participant={participant}
                isLocal={participant.id === userId}
              />
            ))
          ) : (
            <EmptyParticipantsList />
          )}
        </div>
      </div>
    </div>
  );
};

// Export as memo to prevent re-renders when parent components update
export default memo(ParticipantsList);