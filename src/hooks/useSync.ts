
import { useEffect, useState, useCallback } from 'react';
import { SyncService } from '../lib/sync';
import { useOnlineStatus } from './useOnlineStatus';
import { useAuth } from '../context/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db as dbLocal } from '../lib/db';

export function useSync() {
    const isOnline = useOnlineStatus();
    const { user } = useAuth();
    const userId = user?.uid;
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

    // Track queue items
    const queueStats = useLiveQuery(async () => {
        const items = await dbLocal.syncQueue.toArray();
        return {
            total: items.length,
            pending: items.filter(i => i.status === 'PENDING').length,
            error: items.filter(i => i.status === 'ERROR').length
        };
    }, []);

    const triggerSync = useCallback(async () => {
        if (!isOnline || !userId) return;
        setIsSyncing(true);
        try {
            await SyncService.processQueue();
            await SyncService.syncAll(userId);
            setLastSyncTime(Date.now());
        } catch (error) {
            console.error("Sync failed:", error);
        } finally {
            setIsSyncing(false);
        }
    }, [isOnline, userId]);

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

    return { isSyncing, lastSyncTime, triggerSync, queueStats };
}
