import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import roomReducer from "../RoomStore/roomSlice";
import inviteReducer from "../inviteStore/inviteSlice";
import companionReducer from "../companionStore/companionSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    room: roomReducer,
    invite: inviteReducer,
    companion: companionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Backwards-compatible alias used throughout existing components
export type AuthState = RootState;

export default store;
