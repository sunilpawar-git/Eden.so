/**
 * useCompactMode Hook - Applies compact mode CSS class to document
 * Returns the current compact mode state
 */
import { useEffect } from 'react';
import { useSettingsStore } from '@/shared/stores/settingsStore';

const COMPACT_MODE_CLASS = 'compact-mode';

export function useCompactMode(): boolean {
    const compactMode = useSettingsStore((state) => state.compactMode);

    useEffect(() => {
        if (compactMode) {
            document.documentElement.classList.add(COMPACT_MODE_CLASS);
        } else {
            document.documentElement.classList.remove(COMPACT_MODE_CLASS);
        }

        // Cleanup on unmount
        return () => {
            document.documentElement.classList.remove(COMPACT_MODE_CLASS);
        };
    }, [compactMode]);

    return compactMode;
}
