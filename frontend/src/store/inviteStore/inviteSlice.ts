import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface PendingInvite {
  roomId: string;
  inviterName: string;
  inviterUserId: string;
}

interface InviteState {
  pendingInvite: PendingInvite | null;
}

const initialState: InviteState = {
  pendingInvite: null,
};

const inviteSlice = createSlice({
  name: "invite",
  initialState,
  reducers: {
    receiveInvite(state, action: PayloadAction<PendingInvite>) {
      state.pendingInvite = action.payload;
    },
    clearInvite(state) {
      state.pendingInvite = null;
    },
  },
});

export const { receiveInvite, clearInvite } = inviteSlice.actions;
export default inviteSlice.reducer;
