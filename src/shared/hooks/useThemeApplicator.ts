/**
 * Theme Applicator Hook
 * Applies theme to document root and listens for system preference changes
 */
import { useEffect } from 'react';
import { useSettingsStore } from '@/shared/stores/settingsStore';

/**
 * Hook that applies the current theme to the document root
 * and listens for system preference changes when theme is 'system'
 */
export function useThemeApplicator(): void {
    const theme = useSettingsStore((state) => state.theme);

    useEffect(() => {
        // getResolvedTheme is a pure getter — call it via getState() to avoid
        // subscribing a function reference as reactive state (causes re-render churn).
        const applyTheme = () => {
            const resolved = useSettingsStore.getState().getResolvedTheme();
            document.documentElement.dataset.theme = resolved;
        };

        applyTheme();

        if (theme === 'system' && typeof window !== 'undefined') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', applyTheme);
            return () => mediaQuery.removeEventListener('change', applyTheme);
        }
    }, [theme]);
}
