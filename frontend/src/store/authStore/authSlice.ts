import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AuthUser {
  name: string;
  userId: string;
  roomId: string; // always "user_${userId}"
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login(state, action: PayloadAction<{ name: string; userId: string }>) {
      state.isAuthenticated = true;
      state.user = {
        name: action.payload.name,
        userId: action.payload.userId,
        roomId: `user_${action.payload.userId}`,
      };
    },
    logout(state) {
      state.isAuthenticated = false;
      state.user = null;
    },
  },
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;
