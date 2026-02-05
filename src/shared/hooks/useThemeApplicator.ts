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
    const getResolvedTheme = useSettingsStore((state) => state.getResolvedTheme);

    useEffect(() => {
        // Apply the resolved theme to document
        const applyTheme = () => {
            const resolved = getResolvedTheme();
            document.documentElement.dataset.theme = resolved;
        };

        // Apply immediately
        applyTheme();

        // If theme is 'system', listen for system preference changes
        if (theme === 'system' && typeof window !== 'undefined') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            const handleChange = () => {
                applyTheme();
            };

            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [theme, getResolvedTheme]);
}
