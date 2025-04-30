import React from 'react';
import { motion } from 'framer-motion';

interface ChatMessageProps {
  message: {
    id: string;
    content: string;
    sender: {
      id: string;
      name: string;
    };
    timestamp: number;
    isRead: boolean;
  };
  isCurrentUser: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isCurrentUser }) => {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-2`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className={`max-w-[80%]`}>
        {/* Sender info */}
        <div className="flex items-center mb-1">
          {!isCurrentUser && (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-medium mr-2">
              {message.sender.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isCurrentUser ? 'You' : message.sender.name}
          </span>
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            {formatTime(message.timestamp)}
          </span>
        </div>

        {/* Message bubble */}
        <div 
          className={`px-4 py-2 rounded-lg text-sm ${
            isCurrentUser 
              ? 'bg-blue-500 text-white rounded-br-none' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white rounded-bl-none'
          }`}
        >
          {message.content}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatMessage;