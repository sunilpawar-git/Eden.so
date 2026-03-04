/**
 * useOfflineQueue — component-local offline queue for document analysis.
 * Queues analysis intents when offline, processes them when back online.
 * No global store — transient state, cleaned up on unmount.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';

export interface OfflineQueueItem {
    nodeId: string;
    parsedText: string;
    filename: string;
    workspaceId: string;
}

type ProcessCallback = (item: OfflineQueueItem) => void;

export function useOfflineQueue(onProcess?: ProcessCallback) {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const queueRef = useRef<OfflineQueueItem[]>([]);
    const [queueSize, setQueueSize] = useState(0);
    const onProcessRef = useRef(onProcess);
    onProcessRef.current = onProcess;

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            const items = [...queueRef.current];
            queueRef.current = [];
            setQueueSize(0);

            for (const item of items) {
                onProcessRef.current?.(item);
            }
        };

        const handleOffline = () => { setIsOnline(false); };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const enqueueIfOffline = useCallback((item: OfflineQueueItem): boolean => {
        if (navigator.onLine) return true;

        queueRef.current.push(item);
        setQueueSize(queueRef.current.length);
        toast.info(strings.documentAgent.queuedForOnline);
        return false;
    }, []);

    return { isOnline, enqueueIfOffline, queueSize };
}
