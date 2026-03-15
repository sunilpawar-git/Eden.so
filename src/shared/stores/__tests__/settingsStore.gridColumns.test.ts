/**
 * Settings Store — Grid Columns Tests
 * Split from settingsStore.test.ts to keep files under 300 lines.
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

describe('SettingsStore — Grid Columns', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.stubGlobal('localStorage', localStorageMock);
        vi.stubGlobal('matchMedia', mockMatchMedia);
        resetSettingsState();
    });

    afterEach(() => { vi.unstubAllGlobals(); });

    it('should default to 4', () => {
        expect(useSettingsStore.getState().gridColumns).toBe(4);
    });

    it('should set gridColumns to a valid value', () => {
        useSettingsStore.getState().setGridColumns(3);
        expect(useSettingsStore.getState().gridColumns).toBe(3);
    });

    it('should set gridColumns to auto', () => {
        useSettingsStore.getState().setGridColumns('auto');
        expect(useSettingsStore.getState().gridColumns).toBe('auto');
    });

    it('should reject invalid gridColumns value', () => {
        useSettingsStore.getState().setGridColumns(4);
        useSettingsStore.getState().setGridColumns(99 as never);
        expect(useSettingsStore.getState().gridColumns).toBe(4);
    });

    it('should persist gridColumns to localStorage', () => {
        useSettingsStore.getState().setGridColumns(5);
        expect(localStorageMock.setItem).toHaveBeenCalledWith('settings-gridColumns', '5');
    });

    it('should load gridColumns from storage', () => {
        localStorageMock.getItem.mockImplementation((key: string) => {
            if (key === 'settings-gridColumns') return '3';
            return null;
        });
        useSettingsStore.getState().loadFromStorage();
        expect(useSettingsStore.getState().gridColumns).toBe(3);
    });

    it('should load auto gridColumns from storage', () => {
        localStorageMock.getItem.mockImplementation((key: string) => {
            if (key === 'settings-gridColumns') return 'auto';
            return null;
        });
        useSettingsStore.getState().loadFromStorage();
        expect(useSettingsStore.getState().gridColumns).toBe('auto');
    });

    it('should reject hacked gridColumns from storage', () => {
        localStorageMock.getItem.mockImplementation((key: string) => {
            if (key === 'settings-gridColumns') return 'hacked';
            return null;
        });
        useSettingsStore.getState().loadFromStorage();
        expect(useSettingsStore.getState().gridColumns).toBe(4);
    });

    it('should keep default gridColumns when localStorage throws', () => {
        localStorageMock.getItem.mockImplementation(() => {
            throw new Error('SecurityError: localStorage access denied');
        });
        useSettingsStore.getState().loadFromStorage();
        expect(useSettingsStore.getState().gridColumns).toBe(4);
    });
});
