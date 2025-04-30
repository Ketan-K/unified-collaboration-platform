import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// Modal type definitions
type ModalType = 'settings' | 'info' | 'error' | 'confirm' | 'custom' | null;

// Tab type definition
type TabType = 'video' | 'chat' | 'whiteboard' | 'code';

interface ModalState {
  type: ModalType;
  isOpen: boolean;
  title?: string;
  message?: string;
  data?: any;
}

// UI state interface
interface UiState {
  modal: ModalState;
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  isMobile: boolean;
  timeElapsed: number;
  activeTab: TabType;
  notifications: {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    autoClose?: boolean;
    duration?: number;
  }[];
}

// Initial state
const initialState: UiState = {
  modal: {
    type: null,
    isOpen: false,
  },
  sidebarOpen: true,
  theme: 'system',
  isMobile: false,
  timeElapsed: 0,
  activeTab: 'video',
  notifications: [],
};

// Create the UI slice
export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Open modal with provided data
    openModal: (state, action: PayloadAction<{
      type: ModalType;
      title?: string;
      message?: string;
      data?: any;
    }>) => {
      state.modal = {
        type: action.payload.type,
        isOpen: true,
        title: action.payload.title,
        message: action.payload.message,
        data: action.payload.data,
      };
    },
    
    // Close modal
    closeModal: (state) => {
      state.modal = {
        type: null,
        isOpen: false,
      };
    },
    
    // Toggle sidebar
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    
    // Set sidebar state
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    
    // Set mobile view state
    setIsMobile: (state, action: PayloadAction<boolean>) => {
      state.isMobile = action.payload;
    },
    
    // Set active tab
    setActiveTab: (state, action: PayloadAction<TabType>) => {
      state.activeTab = action.payload;
    },
    
    // Increment time elapsed (for meeting duration)
    incrementTimeElapsed: (state) => {
      state.timeElapsed += 1;
    },
    
    // Reset time elapsed
    resetTimeElapsed: (state) => {
      state.timeElapsed = 0;
    },
    
    // Set theme
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
    },
    
    // Add notification
    addNotification: (state, action: PayloadAction<{
      type: 'info' | 'success' | 'warning' | 'error';
      message: string;
      autoClose?: boolean;
      duration?: number;
    }>) => {
      const id = Date.now().toString();
      state.notifications.push({
        id,
        ...action.payload,
      });
    },
    
    // Remove notification
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      );
    },
    
    // Clear all notifications
    clearNotifications: (state) => {
      state.notifications = [];
    },
  },
});

// Export actions
export const {
  openModal,
  closeModal,
  toggleSidebar,
  setSidebarOpen,
  setIsMobile,
  setActiveTab,
  incrementTimeElapsed,
  resetTimeElapsed,
  setTheme,
  addNotification,
  removeNotification,
  clearNotifications,
} = uiSlice.actions;

// Selectors
export const selectModal = (state: RootState) => state.ui.modal;
export const selectTheme = (state: RootState) => state.ui.theme;
export const selectSidebarOpen = (state: RootState) => state.ui.sidebarOpen;
export const selectIsMobile = (state: RootState) => state.ui.isMobile;
export const selectActiveTab = (state: RootState) => state.ui.activeTab;
export const selectTimeElapsed = (state: RootState) => state.ui.timeElapsed;
export const selectNotifications = (state: RootState) => state.ui.notifications;

export default uiSlice.reducer;