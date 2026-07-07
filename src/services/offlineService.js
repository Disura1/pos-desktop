import apiClient from '../api/client';
import { processCheckout } from './saleService';

export const isNetworkError = (err) => !err.response; // no HTTP response reached = can't reach the server

export const cacheCatalog = async (branchId) => {
  try {
    const { data } = await apiClient.get('/products/offline-catalog', { params: { branchId } });
    await window.electronAPI.offlineCache.setCatalog(data);
  } catch {
    // silent — keep using the last good cache if this fails
  }
};

export const getCachedCatalog = () => window.electronAPI.offlineCache.getCatalog();

export const queueOfflineSale = (payload) => window.electronAPI.offlineCache.addToQueue(payload);

export const getPendingSyncCount = async () => {
  const queue = await window.electronAPI.offlineCache.getQueue();
  return queue.length;
};

// Call this periodically — pushes any queued offline sales to the server
export const syncOfflineQueue = async (onResult) => {
  const queue = await window.electronAPI.offlineCache.getQueue();
  for (const entry of queue) {
    try {
      const res = await processCheckout(entry.sale);
      await window.electronAPI.offlineCache.removeFromQueue(entry.localId);
      onResult?.({ entry, success: true, res });
    } catch (err) {
      if (isNetworkError(err)) return; // still offline — stop, try again next interval
      // Reached the server, but it rejected the sale (e.g. stock ran out while offline).
      // Leave it queued and flag it — don't silently lose the sale.
      onResult?.({ entry, success: false, error: err.response?.data?.error || 'Sync failed' });
      return;
    }
  }
};