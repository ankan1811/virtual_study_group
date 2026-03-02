import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface RoomState {
  currentRoomId: string | null;
  isOwner: boolean;
}

const initialState: RoomState = {
  currentRoomId: null,
  isOwner: false,
};

const roomSlice = createSlice({
  name: "room",
  initialState,
  reducers: {
    enterRoom(state, action: PayloadAction<{ roomId: string; isOwner: boolean }>) {
      state.currentRoomId = action.payload.roomId;
      state.isOwner = action.payload.isOwner;
    },
    leaveRoom(state) {
      state.currentRoomId = null;
      state.isOwner = false;
    },
  },
});

export const { enterRoom, leaveRoom } = roomSlice.actions;
export default roomSlice.reducer;
