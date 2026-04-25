import { create } from 'zustand';
import { loadOfflineQueue, saveOfflineQueue, clearOfflineQueue } from '../services/offlineService.js';

const useOfflineQueueStore = create((set, get) => ({
  queue: [],
  isSyncing: false,

  hydrate: async () => {
    const records = await loadOfflineQueue();
    set({ queue: records });
  },

  addRecord: async (record) => {
    const updated = [...get().queue, record];
    set({ queue: updated });
    await saveOfflineQueue(updated);
  },

  syncQueue: async () => {
    const { queue, isSyncing } = get();
    if (isSyncing || queue.length === 0) {
      return;
    }

    set({ isSyncing: true });
    // Secure attendance currently requires live challenge, liveness,
    // and geo validation, so offline replay is intentionally disabled.
    set({ isSyncing: false });
  },

  clearQueue: async () => {
    await clearOfflineQueue();
    set({ queue: [] });
  },
}));

export default useOfflineQueueStore;
