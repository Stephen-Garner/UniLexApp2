import { NativeModules } from 'react-native';
import type { NetInfoState } from '@react-native-community/netinfo';
import type { OfflineController } from '../contracts/services';
import { setOfflineState } from '../state/offline.store';

const isOfflineState = (isConnected: boolean | null, isInternetReachable: boolean | null) =>
  !isConnected || isInternetReachable === false;

type NetInfoModule = {
  addEventListener: (listener: (state: NetInfoState) => void) => () => void;
  fetch: () => Promise<NetInfoState>;
};

let cachedNetInfoModule: NetInfoModule | null | undefined;
let hasWarnedNetInfoUnavailable = false;

const isNetInfoNativeModuleAvailable = () => NativeModules?.RNCNetInfo != null;

const resolveNetInfoModule = (): NetInfoModule | undefined => {
  if (cachedNetInfoModule !== undefined) {
    return cachedNetInfoModule ?? undefined;
  }

  if (!isNetInfoNativeModuleAvailable()) {
    cachedNetInfoModule = null;
    if (__DEV__ && !hasWarnedNetInfoUnavailable) {
      console.warn(
        '@react-native-community/netinfo native module is unavailable; offline detection will be disabled.',
      );
      hasWarnedNetInfoUnavailable = true;
    }
    return undefined;
  }

  try {
    const netInfoExport = require('@react-native-community/netinfo') as {
      default?: NetInfoModule;
    } & NetInfoModule;

    const netInfoModule = (netInfoExport?.default ?? netInfoExport) as NetInfoModule;
    cachedNetInfoModule = netInfoModule;
    return netInfoModule;
  } catch (error) {
    cachedNetInfoModule = null;
    if (__DEV__ && !hasWarnedNetInfoUnavailable) {
      console.warn(
        'Failed to load @react-native-community/netinfo; offline detection will be disabled.',
        error,
      );
      hasWarnedNetInfoUnavailable = true;
    }
    return undefined;
  }
};

/** Offline controller backed by @react-native-community/netinfo. */
export class NetInfoOfflineController implements OfflineController {
  private readonly listeners = new Set<(isOffline: boolean) => void>();
  private unsubscribeNetInfo?: () => void;

  constructor(private readonly netInfo: NetInfoModule) {
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
    const state = await this.netInfo.fetch();
    return isOfflineState(state.isConnected, state.isInternetReachable ?? null);
  }

  private initializeListener() {
    this.unsubscribeNetInfo = this.netInfo.addEventListener(state => {
      const offline = isOfflineState(state.isConnected, state.isInternetReachable ?? null);
      setOfflineState(offline);
      this.listeners.forEach(listener => listener(offline));
    });
  }
}

class NoopOfflineController implements OfflineController {
  private readonly listeners = new Set<(isOffline: boolean) => void>();

  constructor() {
    setOfflineState(false);
  }

  async prepareResources(): Promise<void> {
    // No resources to prepare when NetInfo is unavailable.
  }

  async syncPendingChanges(): Promise<void> {
    // Synchronisation is a no-op without connectivity monitoring.
  }

  onConnectivityChange(callback: (isOffline: boolean) => void): () => void {
    this.listeners.add(callback);
    callback(false);

    return () => {
      this.listeners.delete(callback);
    };
  }

  async isOffline(): Promise<boolean> {
    return false;
  }
}

const netInfoModule = resolveNetInfoModule();

export const offlineController: OfflineController = netInfoModule
  ? new NetInfoOfflineController(netInfoModule)
  : new NoopOfflineController();
