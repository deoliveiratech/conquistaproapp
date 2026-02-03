
import { useSync } from '@/hooks/useSync';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';

export function SyncIndicator() {
    const { isSyncing, triggerSync, lastSyncTime, queueStats } = useSync();
    const isOnline = useOnlineStatus();

    const hasErrors = (queueStats?.error ?? 0) > 0;
    const hasPending = (queueStats?.pending ?? 0) > 0;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
            {/* Queue Status Badge */}
            {(hasPending || hasErrors) && (
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm border animate-in fade-in slide-in-from-bottom-2 ${hasErrors
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-600'
                    : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800 text-indigo-600'
                    }`}>
                    {hasErrors ? (
                        <>Error: {queueStats?.error}</>
                    ) : (
                        <>Syncing: {queueStats?.pending}</>
                    )}
                </div>
            )}

            <div
                className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-lg border transition-all ${isOnline
                    ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-green-600'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-600'
                    }`}
            >
                {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
                <span className="text-xs font-medium hidden sm:inline">
                    {isOnline ? 'Online' : 'Offline'}
                </span>
            </div>

            {isOnline && (
                <button
                    onClick={triggerSync}
                    disabled={isSyncing}
                    className={`p-2 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-all ${isSyncing ? 'animate-spin cursor-not-allowed opacity-80' : ''
                        }`}
                    title={lastSyncTime ? `Última sincronização: ${new Date(lastSyncTime).toLocaleTimeString()}` : 'Clique para sincronizar'}
                >
                    <RefreshCw size={18} />
                </button>
            )}
        </div>
    );
}
