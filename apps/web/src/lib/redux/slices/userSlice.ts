import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// User state interface
interface UserState {
  userId: string | null;
  userName: string | null;
  email: string | null;
  avatar: string | null;
  isHandRaised: boolean;
  settings: {
    audioInputDevice: string | null;
    videoInputDevice: string | null;
    audioOutputDevice: string | null;
    defaultMicEnabled: boolean;
    defaultCameraEnabled: boolean;
    darkMode: boolean;
  };
  devicePreferences: {
    audioInput: string | null;
    audioOutput: string | null;
    videoInput: string | null;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isScreenSharing: boolean;
  };
  isAuthenticated: boolean;
}

// Initial state
const initialState: UserState = {
  userId: null,
  userName: null,
  email: null,
  avatar: null,
  isHandRaised: false,
  settings: {
    audioInputDevice: null,
    videoInputDevice: null,
    audioOutputDevice: null,
    defaultMicEnabled: true,
    defaultCameraEnabled: true,
    darkMode: false,
  },
  devicePreferences: {
    audioInput: null,
    audioOutput: null,
    videoInput: null,
    isAudioEnabled: true,
    isVideoEnabled: true,
    isScreenSharing: false,
  },
  isAuthenticated: false,
};

// Create the user slice
export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Set user data
    setUser: (state, action: PayloadAction<Partial<UserState>>) => {
      return { ...state, ...action.payload };
    },
    
    // Set just the user ID
    setUserId: (state, action: PayloadAction<string>) => {
      state.userId = action.payload;
    },
    
    // Set just the user name
    setUserName: (state, action: PayloadAction<string>) => {
      state.userName = action.payload;
    },
    
    // Toggle audio on/off
    toggleAudio: (state, action: PayloadAction<boolean | undefined>) => {
      const newValue = action.payload !== undefined ? action.payload : !state.devicePreferences.isAudioEnabled;
      state.devicePreferences.isAudioEnabled = newValue;
    },
    
    // Toggle video on/off
    toggleVideo: (state, action: PayloadAction<boolean | undefined>) => {
      const newValue = action.payload !== undefined ? action.payload : !state.devicePreferences.isVideoEnabled;
      state.devicePreferences.isVideoEnabled = newValue;
    },
    
    // Toggle screen sharing on/off
    toggleScreenSharing: (state, action: PayloadAction<boolean | undefined>) => {
      const newValue = action.payload !== undefined ? action.payload : !state.devicePreferences.isScreenSharing;
      state.devicePreferences.isScreenSharing = newValue;
    },
    
    // Toggle hand raised on/off
    toggleHandRaised: (state, action: PayloadAction<boolean | undefined>) => {
      const newValue = action.payload !== undefined ? action.payload : !state.isHandRaised;
      state.isHandRaised = newValue;
    },
    
    // Update user settings
    updateSettings: (state, action: PayloadAction<Partial<UserState['settings']>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    
    // Update device preferences
    updateDevicePreferences: (state, action: PayloadAction<Partial<UserState['devicePreferences']>>) => {
      state.devicePreferences = { ...state.devicePreferences, ...action.payload };
    },
    
    // Set authentication status
    setAuthStatus: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },
    
    // Clear user data on logout
    clearUser: () => {
      return initialState;
    },
  },
});

// Export actions
export const { 
  setUser,
  setUserId,
  setUserName,
  toggleAudio,
  toggleVideo,
  toggleScreenSharing,
  toggleHandRaised,
  updateSettings,
  updateDevicePreferences,
  setAuthStatus,
  clearUser,
} = userSlice.actions;

// Selectors
export const selectUser = (state: RootState) => state.user;
export const selectUserId = (state: RootState) => state.user?.userId;
export const selectUserName = (state: RootState) => state.user?.userName;
export const selectUserSettings = (state: RootState) => state.user?.settings;
export const selectDevicePreferences = (state: RootState) => state.user?.devicePreferences;
export const selectIsAuthenticated = (state: RootState) => state.user?.isAuthenticated;
export const selectIsHandRaised = (state: RootState) => state.user?.isHandRaised;

// Default export
export default userSlice.reducer;