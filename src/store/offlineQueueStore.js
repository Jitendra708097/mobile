import { create } from 'zustand';
import { loadOfflineQueue, saveOfflineQueue, clearOfflineQueue } from '../services/offlineService.js';
import { syncAttendanceRequest } from '../services/attendanceService.js';

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
    try {
      const result = await syncAttendanceRequest(queue);
      const completedIds = new Set(
        (result.results || [])
          .filter((item) => item.status === 'synced' || item.status === 'duplicate' || item.status === 'conflict')
          .map((item) => queue[item.index]?.clientRecordId)
          .filter(Boolean)
      );
      const remaining = queue.filter((record) => !completedIds.has(record.clientRecordId));

      set({ queue: remaining, isSyncing: false });
      await saveOfflineQueue(remaining);
      return result;
    } catch (error) {
      set({ isSyncing: false });
      return null;
    }
  },

  clearQueue: async () => {
    await clearOfflineQueue();
    set({ queue: [] });
  },
}));

export default useOfflineQueueStore;
