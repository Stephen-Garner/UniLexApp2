import { create } from 'zustand';

/** Zustand store tracking offline connectivity state. */
interface OfflineState {
  /** Indicates whether the application is currently offline. */
  isOffline: boolean;
  /** Updates the offline state. */
  setOffline: (value: boolean) => void;
}

export const useOfflineStore = create<OfflineState>(set => ({
  isOffline: false,
  setOffline: value => set({ isOffline: value }),
}));

/** Convenience setter for external services that monitor connectivity. */
export const setOfflineState = (value: boolean) => {
  useOfflineStore.getState().setOffline(value);
};
