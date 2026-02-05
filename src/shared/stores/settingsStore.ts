/**
 * Settings Store - State management for app preferences
 * SSOT for theme, canvas settings, and user preferences
 */
import { create } from 'zustand';

export type ThemeOption = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

// Storage keys
const STORAGE_KEYS = {
    theme: 'settings-theme',
    canvasGrid: 'settings-canvasGrid',
    autoSave: 'settings-autoSave',
    autoSaveInterval: 'settings-autoSaveInterval',
    compactMode: 'settings-compactMode',
} as const;

// Constants
const AUTO_SAVE_MIN = 10;
const AUTO_SAVE_MAX = 300;
const AUTO_SAVE_DEFAULT = 30;

interface SettingsState {
    // State
    theme: ThemeOption;
    canvasGrid: boolean;
    autoSave: boolean;
    autoSaveInterval: number;
    compactMode: boolean;
    
    // Actions
    setTheme: (theme: ThemeOption) => void;
    toggleCanvasGrid: () => void;
    setAutoSave: (enabled: boolean) => void;
    setAutoSaveInterval: (seconds: number) => void;
    toggleCompactMode: () => void;
    getResolvedTheme: () => ResolvedTheme;
    loadFromStorage: () => void;
}

/**
 * Helper to safely get from localStorage
 */
function getStorageItem<T>(key: string, defaultValue: T): T {
    try {
        const item = localStorage.getItem(key);
        if (item === null) return defaultValue;
        
        // Handle boolean values
        if (typeof defaultValue === 'boolean') {
            return (item === 'true') as T;
        }
        // Handle number values
        if (typeof defaultValue === 'number') {
            const parsed = parseInt(item, 10);
            return (isNaN(parsed) ? defaultValue : parsed) as T;
        }
        // Handle string values (including ThemeOption)
        return item as T;
    } catch {
        return defaultValue;
    }
}

/**
 * Helper to safely set to localStorage
 */
function setStorageItem(key: string, value: string | number | boolean): void {
    try {
        localStorage.setItem(key, String(value));
    } catch {
        // Silently fail if localStorage is not available
    }
}

/**
 * Clamp a number to a range
 */
function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
    // Initial state with localStorage values
    theme: getStorageItem<ThemeOption>(STORAGE_KEYS.theme, 'system'),
    canvasGrid: getStorageItem<boolean>(STORAGE_KEYS.canvasGrid, true),
    autoSave: getStorageItem<boolean>(STORAGE_KEYS.autoSave, true),
    autoSaveInterval: getStorageItem<number>(STORAGE_KEYS.autoSaveInterval, AUTO_SAVE_DEFAULT),
    compactMode: getStorageItem<boolean>(STORAGE_KEYS.compactMode, false),

    setTheme: (theme: ThemeOption) => {
        set({ theme });
        setStorageItem(STORAGE_KEYS.theme, theme);
    },

    toggleCanvasGrid: () => {
        const newValue = !get().canvasGrid;
        set({ canvasGrid: newValue });
        setStorageItem(STORAGE_KEYS.canvasGrid, newValue);
    },

    setAutoSave: (enabled: boolean) => {
        set({ autoSave: enabled });
        setStorageItem(STORAGE_KEYS.autoSave, enabled);
    },

    setAutoSaveInterval: (seconds: number) => {
        const clamped = clamp(seconds, AUTO_SAVE_MIN, AUTO_SAVE_MAX);
        set({ autoSaveInterval: clamped });
        setStorageItem(STORAGE_KEYS.autoSaveInterval, clamped);
    },

    toggleCompactMode: () => {
        const newValue = !get().compactMode;
        set({ compactMode: newValue });
        setStorageItem(STORAGE_KEYS.compactMode, newValue);
    },

    getResolvedTheme: (): ResolvedTheme => {
        const { theme } = get();
        
        if (theme === 'light' || theme === 'dark') {
            return theme;
        }
        
        // System preference
        if (typeof window !== 'undefined') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            return prefersDark ? 'dark' : 'light';
        }
        
        return 'light';
    },

    loadFromStorage: () => {
        set({
            theme: getStorageItem<ThemeOption>(STORAGE_KEYS.theme, 'system'),
            canvasGrid: getStorageItem<boolean>(STORAGE_KEYS.canvasGrid, true),
            autoSave: getStorageItem<boolean>(STORAGE_KEYS.autoSave, true),
            autoSaveInterval: getStorageItem<number>(STORAGE_KEYS.autoSaveInterval, AUTO_SAVE_DEFAULT),
            compactMode: getStorageItem<boolean>(STORAGE_KEYS.compactMode, false),
        });
    },
}));
