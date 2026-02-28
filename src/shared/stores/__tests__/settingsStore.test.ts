/**
 * Settings Store Tests - Core settings (non-theme)
 * Theme tests are in settingsStoreTheme.test.ts
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useSettingsStore } from '../settingsStore';
import {
    createLocalStorageMock,
    createMockMatchMedia,
    resetSettingsState,
} from './helpers/settingsTestSetup';

vi.mock('@/shared/services/analyticsService', () => ({
    trackSettingsChanged: vi.fn(),
}));

const localStorageMock = createLocalStorageMock();
const mockMatchMedia = createMockMatchMedia();

describe('SettingsStore', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.stubGlobal('localStorage', localStorageMock);
        vi.stubGlobal('matchMedia', mockMatchMedia);
        resetSettingsState();
    });

    afterEach(() => { vi.unstubAllGlobals(); });

    describe('initial state', () => {
        it('should initialize with default values', () => {
            const state = useSettingsStore.getState();
            expect(state.theme).toBe('system');
            expect(state.canvasGrid).toBe(true);
            expect(state.autoSave).toBe(true);
            expect(state.autoSaveInterval).toBe(30);
            expect(state.compactMode).toBe(false);
            expect(state.canvasScrollMode).toBe('zoom');
            expect(state.connectorStyle).toBe('solid');
            expect(state.lastSettingsTab).toBe('appearance');
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
            expect(localStorageMock.setItem).toHaveBeenCalledWith('settings-canvasGrid', 'false');
        });
    });

    describe('canvas scroll mode', () => {
        it('should default to zoom mode', () => {
            expect(useSettingsStore.getState().canvasScrollMode).toBe('zoom');
        });

        it('should set scroll mode to navigate', () => {
            useSettingsStore.getState().setCanvasScrollMode('navigate');
            expect(useSettingsStore.getState().canvasScrollMode).toBe('navigate');
        });

        it('should set scroll mode back to zoom', () => {
            useSettingsStore.getState().setCanvasScrollMode('navigate');
            useSettingsStore.getState().setCanvasScrollMode('zoom');
            expect(useSettingsStore.getState().canvasScrollMode).toBe('zoom');
        });

        it('should persist canvasScrollMode to localStorage', () => {
            useSettingsStore.getState().setCanvasScrollMode('navigate');
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'settings-canvasScrollMode',
                'navigate'
            );
        });

        it('should load canvasScrollMode from storage', () => {
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'settings-canvasScrollMode') return 'navigate';
                return null;
            });
            useSettingsStore.getState().loadFromStorage();
            expect(useSettingsStore.getState().canvasScrollMode).toBe('navigate');
        });
    });

    describe('connector style', () => {
        it('should default to solid style', () => {
            expect(useSettingsStore.getState().connectorStyle).toBe('solid');
        });

        it('should set connector style to thick', () => {
            useSettingsStore.getState().setConnectorStyle('thick');
            expect(useSettingsStore.getState().connectorStyle).toBe('thick');
        });

        it('should persist connectorStyle to localStorage', () => {
            useSettingsStore.getState().setConnectorStyle('dashed');
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'settings-connectorStyle',
                'dashed'
            );
        });

        it('should load connectorStyle from storage', () => {
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'settings-connectorStyle') return 'dotted';
                return null;
            });
            useSettingsStore.getState().loadFromStorage();
            expect(useSettingsStore.getState().connectorStyle).toBe('dotted');
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
            expect(localStorageMock.setItem).toHaveBeenCalledWith('settings-autoSave', 'false');
        });

        it('should persist autoSaveInterval to localStorage', () => {
            useSettingsStore.getState().setAutoSaveInterval(45);
            expect(localStorageMock.setItem).toHaveBeenCalledWith('settings-autoSaveInterval', '45');
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
            expect(localStorageMock.setItem).toHaveBeenCalledWith('settings-compactMode', 'true');
        });
    });

    describe('canvas locked', () => {
        it('should default to unlocked', () => {
            expect(useSettingsStore.getState().isCanvasLocked).toBe(false);
        });

        it('should toggle isCanvasLocked setting', () => {
            expect(useSettingsStore.getState().isCanvasLocked).toBe(false);
            useSettingsStore.getState().toggleCanvasLocked();
            expect(useSettingsStore.getState().isCanvasLocked).toBe(true);
            useSettingsStore.getState().toggleCanvasLocked();
            expect(useSettingsStore.getState().isCanvasLocked).toBe(false);
        });

        it('should persist isCanvasLocked to localStorage', () => {
            useSettingsStore.getState().toggleCanvasLocked();
            expect(localStorageMock.setItem).toHaveBeenCalledWith('settings-isCanvasLocked', 'true');
        });

        it('should load isCanvasLocked from storage', () => {
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'settings-isCanvasLocked') return 'true';
                return null;
            });
            useSettingsStore.getState().loadFromStorage();
            expect(useSettingsStore.getState().isCanvasLocked).toBe(true);
        });
    });

    describe('canvas free flow', () => {
        it('should default to false', () => {
            expect(useSettingsStore.getState().canvasFreeFlow).toBe(false);
        });

        it('should toggle canvasFreeFlow setting', () => {
            expect(useSettingsStore.getState().canvasFreeFlow).toBe(false);
            useSettingsStore.getState().toggleCanvasFreeFlow();
            expect(useSettingsStore.getState().canvasFreeFlow).toBe(true);
            useSettingsStore.getState().toggleCanvasFreeFlow();
            expect(useSettingsStore.getState().canvasFreeFlow).toBe(false);
        });

        it('should persist canvasFreeFlow to localStorage', () => {
            useSettingsStore.getState().toggleCanvasFreeFlow();
            expect(localStorageMock.setItem).toHaveBeenCalledWith('settings-canvasFreeFlow', 'true');
        });

        it('should load canvasFreeFlow from storage', () => {
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'settings-canvasFreeFlow') return 'true';
                return null;
            });
            useSettingsStore.getState().loadFromStorage();
            expect(useSettingsStore.getState().canvasFreeFlow).toBe(true);
        });

        it('should reject invalid canvasFreeFlow localStorage value', () => {
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'settings-canvasFreeFlow') return 'hacked';
                return null;
            });
            useSettingsStore.getState().loadFromStorage();
            expect(useSettingsStore.getState().canvasFreeFlow).toBe(false);
        });
    });

    describe('localStorage persistence', () => {
        it('should load theme from localStorage via loadFromStorage', () => {
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'settings-theme') return 'dark';
                return null;
            });
            useSettingsStore.getState().loadFromStorage();
            expect(localStorageMock.getItem).toHaveBeenCalledWith('settings-theme');
            expect(useSettingsStore.getState().theme).toBe('dark');
        });
    });

    describe('invalid localStorage values (defense-in-depth)', () => {
        it('should fall back to default theme for invalid stored value', () => {
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'settings-theme') return 'hackedTheme';
                return null;
            });
            useSettingsStore.getState().loadFromStorage();
            expect(useSettingsStore.getState().theme).toBe('system');
        });

        it('should fall back to default theme for empty string', () => {
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'settings-theme') return '';
                return null;
            });
            useSettingsStore.getState().loadFromStorage();
            expect(useSettingsStore.getState().theme).toBe('system');
        });

        it('should fall back to default scroll mode for invalid stored value', () => {
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'settings-canvasScrollMode') return 'fly';
                return null;
            });
            useSettingsStore.getState().loadFromStorage();
            expect(useSettingsStore.getState().canvasScrollMode).toBe('zoom');
        });

        it('should fall back to default connector style for invalid stored value', () => {
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'settings-connectorStyle') return 'zigzag';
                return null;
            });
            useSettingsStore.getState().loadFromStorage();
            expect(useSettingsStore.getState().connectorStyle).toBe('solid');
        });

        it('should reject XSS payload in theme value', () => {
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'settings-theme') return '<script>alert(1)</script>';
                return null;
            });
            useSettingsStore.getState().loadFromStorage();
            expect(useSettingsStore.getState().theme).toBe('system');
        });
    });


});
