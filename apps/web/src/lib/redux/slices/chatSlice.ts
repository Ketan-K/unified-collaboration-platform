import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// Message interface
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isSystemMessage?: boolean;
  replyTo?: string;
}

// Chat state interface
interface ChatState {
  messages: ChatMessage[];
  unreadCount: number;
  isOpen: boolean;
  error: string | null;
}

// Initial state
const initialState: ChatState = {
  messages: [],
  unreadCount: 0,
  isOpen: false,
  error: null,
};

// Create the chat slice
export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // Add a new message to the chat
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
      
      // Increment unread count if chat is not open
      if (!state.isOpen) {
        state.unreadCount += 1;
      }
    },
    
    // Send a new message (thunk action will handle the actual sending)
    sendMessage: (state, action: PayloadAction<{
      content: string;
      replyTo?: string;
    }>) => {
      // This is just a marker action for middleware to intercept
      // The actual message will be added via addMessage when received from server
    },
    
    // Mark all messages as read
    markAllAsRead: (state) => {
      state.unreadCount = 0;
    },
    
    // Add system message (like user joined/left)
    addSystemMessage: (state, action: PayloadAction<Omit<ChatMessage, 'id' | 'isSystemMessage'>>) => {
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        isSystemMessage: true,
        ...action.payload,
      };
      state.messages.push(systemMessage);
    },
    
    // Toggle chat panel open state
    toggleChat: (state) => {
      state.isOpen = !state.isOpen;
      
      // Reset unread count when opening chat
      if (state.isOpen) {
        state.unreadCount = 0;
      }
    },
    
    // Set chat open state explicitly
    setChatOpen: (state, action: PayloadAction<boolean>) => {
      state.isOpen = action.payload;
      
      // Reset unread count when opening chat
      if (state.isOpen) {
        state.unreadCount = 0;
      }
    },
    
    // Clear unread count
    clearUnreadCount: (state) => {
      state.unreadCount = 0;
    },
    
    // Clear all messages (e.g., when leaving a room)
    clearMessages: (state) => {
      state.messages = [];
      state.unreadCount = 0;
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
  addMessage,
  sendMessage,
  markAllAsRead,
  addSystemMessage,
  toggleChat,
  setChatOpen,
  clearUnreadCount,
  clearMessages,
  setError,
  clearError,
} = chatSlice.actions;

// Selectors
export const selectMessages = (state: RootState) => state.chat.messages;
export const selectUnreadCount = (state: RootState) => state.chat.unreadCount;
export const selectIsChatOpen = (state: RootState) => state.chat.isOpen;

export default chatSlice.reducer;