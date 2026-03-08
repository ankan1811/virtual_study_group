import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AuthUser {
  name: string;
  userId: string;
  roomId: string; // always "user_${userId}"
  avatar: string;
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
    login(state, action: PayloadAction<{ name: string; userId: string; avatar?: string }>) {
      state.isAuthenticated = true;
      state.user = {
        name: action.payload.name,
        userId: action.payload.userId,
        roomId: `user_${action.payload.userId}`,
        avatar: action.payload.avatar || "",
      };
    },
    logout(state) {
      state.isAuthenticated = false;
      state.user = null;
    },
    updateName(state, action: PayloadAction<string>) {
      if (state.user) {
        state.user.name = action.payload;
      }
    },
    updateAvatar(state, action: PayloadAction<string>) {
      if (state.user) {
        state.user.avatar = action.payload;
      }
    },
  },
});

export const { login, logout, updateName, updateAvatar } = authSlice.actions;
export default authSlice.reducer;
