import { configureStore } from '@reduxjs/toolkit';
import { useDispatch } from 'react-redux';
import roomReducer from './slices/roomSlice';
import userReducer from './slices/userSlice';
import uiReducer from './slices/uiSlice';
import chatReducer from './slices/chatSlice';

export const store = configureStore({
  reducer: {
    room: roomReducer,
    user: userReducer,
    ui: uiReducer,
    chat: chatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['room/addParticipant', 'room/updateParticipant'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.stream', 'meta.arg.stream'],
        // Ignore these paths in the state
        ignoredPaths: ['room.participants.*.stream'],
      },
    }),
});

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export store singleton instance
export default store;