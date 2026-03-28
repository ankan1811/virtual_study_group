import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Companion {
  userId: string;
  name: string;
  isOnline: boolean;
}

interface CompanionState {
  companions: Companion[];
  pendingRequests: { requesterId: string; requesterName: string }[];
}

const initialState: CompanionState = {
  companions: [],
  pendingRequests: [],
};

const companionSlice = createSlice({
  name: "companion",
  initialState,
  reducers: {
    setCompanions(state, action: PayloadAction<{ userId: string; name: string }[]>) {
      const oldMap = new Map(state.companions.map((c) => [c.userId, c.isOnline]));
      state.companions = action.payload.map((c) => ({
        ...c,
        isOnline: oldMap.get(c.userId) ?? false,
      }));
    },
    setOnline(state, action: PayloadAction<string>) {
      const c = state.companions.find((c) => c.userId === action.payload);
      if (c) c.isOnline = true;
    },
    setOffline(state, action: PayloadAction<string>) {
      const c = state.companions.find((c) => c.userId === action.payload);
      if (c) c.isOnline = false;
    },
    setPendingRequests(
      state,
      action: PayloadAction<{ requesterId: string; requesterName: string }[]>
    ) {
      state.pendingRequests = action.payload;
    },
    addPendingRequest(
      state,
      action: PayloadAction<{ requesterId: string; requesterName: string }>
    ) {
      const exists = state.pendingRequests.some(
        (r) => r.requesterId === action.payload.requesterId
      );
      if (!exists) state.pendingRequests.push(action.payload);
    },
    removePendingRequest(state, action: PayloadAction<string>) {
      state.pendingRequests = state.pendingRequests.filter(
        (r) => r.requesterId !== action.payload
      );
    },
    addCompanion(state, action: PayloadAction<{ userId: string; name: string }>) {
      const exists = state.companions.some((c) => c.userId === action.payload.userId);
      if (!exists) state.companions.push({ ...action.payload, isOnline: true });
    },
  },
});

export const {
  setCompanions,
  setOnline,
  setOffline,
  setPendingRequests,
  addPendingRequest,
  removePendingRequest,
  addCompanion,
} = companionSlice.actions;
export default companionSlice.reducer;
