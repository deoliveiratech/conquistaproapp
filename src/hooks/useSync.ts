
import { useEffect, useState, useCallback } from 'react';
import { SyncService } from '../lib/sync';
import { useOnlineStatus } from './useOnlineStatus';

export function useSync() {
    const isOnline = useOnlineStatus();
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

    const triggerSync = useCallback(async () => {
        if (!isOnline) return;
        setIsSyncing(true);
        try {
            await SyncService.processQueue();
            await SyncService.syncAll();
            setLastSyncTime(Date.now());
        } catch (error) {
            console.error("Sync failed:", error);
        } finally {
            setIsSyncing(false);
        }
    }, [isOnline]);

    // Auto-sync when coming back online
    useEffect(() => {
        if (isOnline) {
            triggerSync();
        }
    }, [isOnline, triggerSync]);

    // Periodic sync (every 5 minutes)
    useEffect(() => {
        if (!isOnline) return;
        const interval = setInterval(triggerSync, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [isOnline, triggerSync]);

    return { isSyncing, lastSyncTime, triggerSync };
}
