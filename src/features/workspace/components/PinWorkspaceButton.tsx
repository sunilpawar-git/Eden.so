/**
 * PinWorkspaceButton - Toggle pin for offline workspace availability
 * Gated behind subscription: free users see upgrade prompt.
 * All text from strings.pinning.* -- no hardcoded strings.
 */
import { useCallback, useState, useEffect } from 'react';
import { usePinnedWorkspaceStore } from '../stores/pinnedWorkspaceStore';
import { useFeatureGate } from '@/features/subscription/hooks/useFeatureGate';
import { GATED_FEATURES } from '@/features/subscription/types/subscription';
import { UpgradePrompt } from '@/shared/components/UpgradePrompt';
import { storageQuotaService } from '@/shared/services/storageQuotaService';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';
import styles from './PinWorkspaceButton.module.css';

interface PinWorkspaceButtonProps {
    workspaceId: string;
}

export function PinWorkspaceButton({ workspaceId }: PinWorkspaceButtonProps) {
    const isPinned = usePinnedWorkspaceStore((s) => s.isPinned(workspaceId));
    const { hasAccess } = useFeatureGate(GATED_FEATURES.offlinePin);
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [storageLabel, setStorageLabel] = useState<string | null>(null);

    // Show storage usage when pinned
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

    const label = isPinned
        ? strings.pinning.unpin
        : strings.pinning.pin;

    const storageInfo = isPinned && storageLabel
        ? ` (${strings.pinning.storageUsage}: ${storageLabel})`
        : '';

    const title = isPinned
        ? `${strings.pinning.unpinTooltip}${storageInfo}`
        : strings.pinning.pinTooltip;

    return (
        <>
            <button
                className={`${styles.pinButton} ${isPinned ? styles.pinned : ''}`}
                onClick={handleToggle}
                title={title}
                aria-label={label}
            >
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill={isPinned ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
            </button>
            {showUpgrade && (
                <UpgradePrompt
                    featureName={strings.pinning.pin}
                    onDismiss={() => setShowUpgrade(false)}
                    onUpgrade={() => {
                        setShowUpgrade(false);
                        toast.info(strings.common.comingSoon);
                    }}
                />
            )}
        </>
    );
}
