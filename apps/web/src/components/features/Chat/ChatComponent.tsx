import React, { useState, useRef, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../../lib/hooks/reduxHooks';
import ChatMessage from './ChatMessage';
import { sendMessage, markAllAsRead } from '../../../lib/redux/slices/chatSlice';
import socketService from '../../../utils/socket/socketService';

const ChatComponent: React.FC = () => {
  const dispatch = useAppDispatch();
  const { messages, unreadCount } = useAppSelector((state) => state.chat);
  const { userId, userName } = useAppSelector((state) => state.user);
  const { roomId, participants } = useAppSelector((state) => state.room);

  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Mark messages as read when component is visible
  useEffect(() => {
    if (unreadCount > 0) {
      dispatch(markAllAsRead());
    }
  }, [dispatch, unreadCount]);

  // Submit message
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    // Create message object
    const messageObj = {
      id: `${Date.now()}-${userId}`,
      content: newMessage.trim(),
      timestamp: Date.now(),
      sender: {
        id: userId,
        name: userName
      },
      isRead: false
    };
    
    // Add message to local state
    dispatch(sendMessage(messageObj));
    
    // Send message to server
    socketService.sendChatMessage(messageObj);
    
    // Clear input
    setNewMessage('');
  };

  // Group messages by sender for cleaner UI
  const groupMessages = () => {
    const groups: any[] = [];
    
    messages.forEach((message, index) => {
      const previousMessage = messages[index - 1];
      
      // Start a new group if:
      // 1. It's the first message
      // 2. Different sender from previous message
      // 3. More than 2 minutes from previous message
      const isNewGroup = !previousMessage ||
        previousMessage.sender.id !== message.sender.id ||
        (message.timestamp - previousMessage.timestamp) > 2 * 60 * 1000;
      
      if (isNewGroup) {
        groups.push([message]);
      } else {
        groups[groups.length - 1].push(message);
      }
    });
    
    return groups;
  };

  const messageGroups = groupMessages();

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-lg">
      {/* Chat header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg text-gray-800 dark:text-white">Chat</h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {Object.keys(participants).length} participant{Object.keys(participants).length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
      
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messageGroups.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
            <div>
              <p className="mb-2 text-lg">No messages yet</p>
              <p className="text-sm">Start the conversation by sending a message</p>
            </div>
          </div>
        ) : (
          messageGroups.map((group, groupIndex) => (
            <div key={`group-${groupIndex}`} className="mb-4">
              {group.map((message: any) => (
                <ChatMessage 
                  key={message.id} 
                  message={message} 
                  isCurrentUser={message.sender.id === userId} 
                />
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Chat input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-100 dark:bg-gray-800 border-0 rounded-full px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-800 dark:text-white"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className={`px-4 py-2 rounded-full font-medium transition-colors ${
              newMessage.trim()
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatComponent;