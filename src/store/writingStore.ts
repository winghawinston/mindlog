// A lightweight store that signals to the rest of the app when the user
// is in active writing mode. The DashboardNav reads this to retreat.
// No persistence needed — this resets naturally on page navigation.

import { create } from "zustand";

interface WritingState {
  isCanvasMode: boolean;
  setCanvasMode: (value: boolean) => void;
}

export const useWritingStore = create<WritingState>((set) => ({
  isCanvasMode: false,
  setCanvasMode: (value) => set({ isCanvasMode: value }),
}));