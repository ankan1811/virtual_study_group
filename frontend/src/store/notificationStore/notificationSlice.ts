import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AppNotification {
  _id: string;
  type: 'companion_request' | 'companion_accepted' | 'room_invite';
  fromUserId: string;
  fromUserName: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  items: AppNotification[];
}

const initialState: NotificationState = { items: [] };

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    setNotifications(state, action: PayloadAction<AppNotification[]>) {
      state.items = action.payload;
    },
    addNotification(state, action: PayloadAction<AppNotification>) {
      // Prepend; avoid duplicates by _id
      const exists = state.items.some((n) => n._id === action.payload._id);
      if (!exists) state.items.unshift(action.payload);
    },
    markOneRead(state, action: PayloadAction<string>) {
      const n = state.items.find((n) => n._id === action.payload);
      if (n) n.read = true;
    },
    markAllReadLocal(state) {
      state.items.forEach((n) => (n.read = true));
    },
    removeNotification(state, action: PayloadAction<string>) {
      state.items = state.items.filter((n) => n._id !== action.payload);
    },
  },
});

export const {
  setNotifications,
  addNotification,
  markOneRead,
  markAllReadLocal,
  removeNotification,
} = notificationSlice.actions;

export default notificationSlice.reducer;
