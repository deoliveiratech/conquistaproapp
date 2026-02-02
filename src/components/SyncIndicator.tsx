
import { useSync } from '@/hooks/useSync';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';

export function SyncIndicator() {
    const { isSyncing, triggerSync, lastSyncTime } = useSync();
    const isOnline = useOnlineStatus();

    return (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
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
