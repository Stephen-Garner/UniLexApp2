import NetInfo, { NetInfoSubscription } from '@react-native-community/netinfo';
import type { OfflineController } from '../contracts/services';
import { setOfflineState } from '../state/offline.store';

const isOfflineState = (isConnected: boolean | null, isInternetReachable: boolean | null) =>
  !isConnected || isInternetReachable === false;

/** Offline controller backed by @react-native-community/netinfo. */
export class NetInfoOfflineController implements OfflineController {
  private readonly listeners = new Set<(isOffline: boolean) => void>();
  private unsubscribeNetInfo?: NetInfoSubscription;

  constructor() {
    this.initializeListener();
  }

  async prepareResources(): Promise<void> {
    // No-op prefetching step for now.
  }

  async syncPendingChanges(): Promise<void> {
    // Synchronisation is handled elsewhere in the application.
  }

  onConnectivityChange(callback: (isOffline: boolean) => void): () => void {
    this.listeners.add(callback);

    return () => {
      this.listeners.delete(callback);
    };
  }

  async isOffline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return isOfflineState(state.isConnected, state.isInternetReachable ?? null);
  }

  private initializeListener() {
    this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const offline = isOfflineState(state.isConnected, state.isInternetReachable ?? null);
      setOfflineState(offline);
      this.listeners.forEach(listener => listener(offline));
    });
  }
}

export const offlineController = new NetInfoOfflineController();
