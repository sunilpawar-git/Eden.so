/**
 * usePinWorkspaceButton — ViewModel hook for PinWorkspaceButton
 * Extracts pin state, storage label, toggle handler, and upgrade gate.
 */
import { useCallback, useState, useEffect, useMemo } from 'react';
import { usePinnedWorkspaceStore } from '../stores/pinnedWorkspaceStore';
import { useFeatureGate } from '@/features/subscription/hooks/useFeatureGate';
import { GATED_FEATURES } from '@/features/subscription/types/subscription';
import { storageQuotaService } from '@/shared/services/storageQuotaService';

export function usePinWorkspaceButton(workspaceId: string) {
    const pinnedIds = usePinnedWorkspaceStore((s) => s.pinnedIds);
    const isPinned = useMemo(() => pinnedIds.includes(workspaceId), [pinnedIds, workspaceId]);
    const { hasAccess } = useFeatureGate(GATED_FEATURES.offlinePin);
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [storageLabel, setStorageLabel] = useState<string | null>(null);

    useEffect(() => {
        if (!isPinned) {
            setStorageLabel(null);
            return;
        }
        void storageQuotaService.getQuotaInfo().then((info) => {
            if (info.isAvailable && info.usageBytes > 0) {
                setStorageLabel(storageQuotaService.formatBytes(info.usageBytes));
            }
        });
    }, [isPinned]);

    const handleToggle = useCallback(async () => {
        if (!hasAccess && !isPinned) {
            setShowUpgrade(true);
            return;
        }
        const store = usePinnedWorkspaceStore.getState();
        if (isPinned) {
            await store.unpinWorkspace(workspaceId);
        } else {
            await store.pinWorkspace(workspaceId);
        }
    }, [hasAccess, isPinned, workspaceId]);

    return { isPinned, showUpgrade, setShowUpgrade, storageLabel, handleToggle };
}
