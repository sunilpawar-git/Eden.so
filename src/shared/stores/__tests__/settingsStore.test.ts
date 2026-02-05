/**
 * Settings Store Tests - TDD: Write tests FIRST
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useSettingsStore } from '../settingsStore';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
            store = Object.fromEntries(
                Object.entries(store).filter(([k]) => k !== key)
            );
        }),
        clear: vi.fn(() => {
            store = {};
        }),
    };
})();

// Mock matchMedia for system theme detection
const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-color-scheme: dark)' ? false : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
}));

describe('SettingsStore', () => {
    beforeEach(() => {
        // Reset mocks
        localStorageMock.clear();
        vi.stubGlobal('localStorage', localStorageMock);
        vi.stubGlobal('matchMedia', mockMatchMedia);
        
        // Reset store state before each test
        useSettingsStore.setState({
            theme: 'system',
            canvasGrid: true,
            autoSave: true,
            autoSaveInterval: 30,
            compactMode: false,
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('initial state', () => {
        it('should initialize with default values', () => {
            const state = useSettingsStore.getState();
            
            expect(state.theme).toBe('system');
            expect(state.canvasGrid).toBe(true);
            expect(state.autoSave).toBe(true);
            expect(state.autoSaveInterval).toBe(30);
            expect(state.compactMode).toBe(false);
        });
    });

    describe('theme management', () => {
        it('should set theme to light', () => {
            useSettingsStore.getState().setTheme('light');
            
            expect(useSettingsStore.getState().theme).toBe('light');
        });

        it('should set theme to dark', () => {
            useSettingsStore.getState().setTheme('dark');
            
            expect(useSettingsStore.getState().theme).toBe('dark');
        });

        it('should set theme to system', () => {
            useSettingsStore.getState().setTheme('light');
            useSettingsStore.getState().setTheme('system');
            
            expect(useSettingsStore.getState().theme).toBe('system');
        });

        it('should persist theme to localStorage', () => {
            useSettingsStore.getState().setTheme('dark');
            
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'settings-theme',
                'dark'
            );
        });

        it('should resolve system theme to light when system prefers light', () => {
            mockMatchMedia.mockImplementation((query: string) => ({
                matches: query === '(prefers-color-scheme: dark)' ? false : true,
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            }));

            useSettingsStore.setState({ theme: 'system' });
            const resolved = useSettingsStore.getState().getResolvedTheme();
            
            expect(resolved).toBe('light');
        });

        it('should resolve system theme to dark when system prefers dark', () => {
            mockMatchMedia.mockImplementation((query: string) => ({
                matches: query === '(prefers-color-scheme: dark)' ? true : false,
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            }));

            useSettingsStore.setState({ theme: 'system' });
            const resolved = useSettingsStore.getState().getResolvedTheme();
            
            expect(resolved).toBe('dark');
        });

        it('should resolve light theme directly', () => {
            useSettingsStore.setState({ theme: 'light' });
            const resolved = useSettingsStore.getState().getResolvedTheme();
            
            expect(resolved).toBe('light');
        });

        it('should resolve dark theme directly', () => {
            useSettingsStore.setState({ theme: 'dark' });
            const resolved = useSettingsStore.getState().getResolvedTheme();
            
            expect(resolved).toBe('dark');
        });
    });

    describe('canvas settings', () => {
        it('should toggle canvasGrid setting', () => {
            expect(useSettingsStore.getState().canvasGrid).toBe(true);
            
            useSettingsStore.getState().toggleCanvasGrid();
            expect(useSettingsStore.getState().canvasGrid).toBe(false);
            
            useSettingsStore.getState().toggleCanvasGrid();
            expect(useSettingsStore.getState().canvasGrid).toBe(true);
        });

        it('should persist canvasGrid to localStorage', () => {
            useSettingsStore.getState().toggleCanvasGrid();
            
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'settings-canvasGrid',
                'false'
            );
        });
    });

    describe('auto-save settings', () => {
        it('should set autoSave enabled state', () => {
            useSettingsStore.getState().setAutoSave(false);
            expect(useSettingsStore.getState().autoSave).toBe(false);
            
            useSettingsStore.getState().setAutoSave(true);
            expect(useSettingsStore.getState().autoSave).toBe(true);
        });

        it('should update autoSaveInterval within valid range', () => {
            useSettingsStore.getState().setAutoSaveInterval(60);
            expect(useSettingsStore.getState().autoSaveInterval).toBe(60);
        });

        it('should clamp autoSaveInterval to minimum of 10 seconds', () => {
            useSettingsStore.getState().setAutoSaveInterval(5);
            expect(useSettingsStore.getState().autoSaveInterval).toBe(10);
        });

        it('should clamp autoSaveInterval to maximum of 300 seconds', () => {
            useSettingsStore.getState().setAutoSaveInterval(500);
            expect(useSettingsStore.getState().autoSaveInterval).toBe(300);
        });

        it('should persist autoSave to localStorage', () => {
            useSettingsStore.getState().setAutoSave(false);
            
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'settings-autoSave',
                'false'
            );
        });

        it('should persist autoSaveInterval to localStorage', () => {
            useSettingsStore.getState().setAutoSaveInterval(45);
            
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'settings-autoSaveInterval',
                '45'
            );
        });
    });

    describe('compact mode', () => {
        it('should toggle compactMode setting', () => {
            expect(useSettingsStore.getState().compactMode).toBe(false);
            
            useSettingsStore.getState().toggleCompactMode();
            expect(useSettingsStore.getState().compactMode).toBe(true);
            
            useSettingsStore.getState().toggleCompactMode();
            expect(useSettingsStore.getState().compactMode).toBe(false);
        });

        it('should persist compactMode to localStorage', () => {
            useSettingsStore.getState().toggleCompactMode();
            
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'settings-compactMode',
                'true'
            );
        });
    });

    describe('localStorage persistence', () => {
        it('should load theme from localStorage on init', () => {
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'settings-theme') return 'dark';
                return null;
            });

            // Trigger load
            useSettingsStore.getState().loadFromStorage();
            
            expect(localStorageMock.getItem).toHaveBeenCalledWith('settings-theme');
        });
    });
});
