/**
 * Settings Store Theme Tests - TDD: Theme management
 * Split from settingsStore.test.ts for 300-line compliance
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useSettingsStore } from '../settingsStore';
import {
    createLocalStorageMock,
    createMockMatchMedia,
    resetSettingsState,
} from './helpers/settingsTestSetup';

const localStorageMock = createLocalStorageMock();
const mockMatchMedia = createMockMatchMedia();

describe('SettingsStore - Theme', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.stubGlobal('localStorage', localStorageMock);
        vi.stubGlobal('matchMedia', mockMatchMedia);
        resetSettingsState();
    });

    afterEach(() => { vi.unstubAllGlobals(); });

    describe('base theme options', () => {
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
            expect(localStorageMock.setItem).toHaveBeenCalledWith('settings-theme', 'dark');
        });
    });

    describe('system theme resolution', () => {
        it('should resolve system theme to light when system prefers light', () => {
            mockMatchMedia.mockImplementation((query: string) => ({
                matches: query === '(prefers-color-scheme: dark)' ? false : true,
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            }));
            useSettingsStore.setState({ theme: 'system' });
            expect(useSettingsStore.getState().getResolvedTheme()).toBe('light');
        });

        it('should resolve system theme to dark when system prefers dark', () => {
            mockMatchMedia.mockImplementation((query: string) => ({
                matches: query === '(prefers-color-scheme: dark)' ? true : false,
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            }));
            useSettingsStore.setState({ theme: 'system' });
            expect(useSettingsStore.getState().getResolvedTheme()).toBe('dark');
        });

        it('should resolve light theme directly', () => {
            useSettingsStore.setState({ theme: 'light' });
            expect(useSettingsStore.getState().getResolvedTheme()).toBe('light');
        });

        it('should resolve dark theme directly', () => {
            useSettingsStore.setState({ theme: 'dark' });
            expect(useSettingsStore.getState().getResolvedTheme()).toBe('dark');
        });
    });

    describe('extended themes', () => {
        it('should set theme to sepia', () => {
            useSettingsStore.getState().setTheme('sepia');
            expect(useSettingsStore.getState().theme).toBe('sepia');
        });

        it('should set theme to grey', () => {
            useSettingsStore.getState().setTheme('grey');
            expect(useSettingsStore.getState().theme).toBe('grey');
        });

        it('should set theme to darkBlack', () => {
            useSettingsStore.getState().setTheme('darkBlack');
            expect(useSettingsStore.getState().theme).toBe('darkBlack');
        });

        it('should resolve sepia theme directly', () => {
            useSettingsStore.setState({ theme: 'sepia' });
            expect(useSettingsStore.getState().getResolvedTheme()).toBe('sepia');
        });

        it('should resolve grey theme directly', () => {
            useSettingsStore.setState({ theme: 'grey' });
            expect(useSettingsStore.getState().getResolvedTheme()).toBe('grey');
        });

        it('should resolve darkBlack theme directly', () => {
            useSettingsStore.setState({ theme: 'darkBlack' });
            expect(useSettingsStore.getState().getResolvedTheme()).toBe('darkBlack');
        });

        it('should persist sepia theme to localStorage', () => {
            useSettingsStore.getState().setTheme('sepia');
            expect(localStorageMock.setItem).toHaveBeenCalledWith('settings-theme', 'sepia');
        });

        it('should persist grey theme to localStorage', () => {
            useSettingsStore.getState().setTheme('grey');
            expect(localStorageMock.setItem).toHaveBeenCalledWith('settings-theme', 'grey');
        });

        it('should persist darkBlack theme to localStorage', () => {
            useSettingsStore.getState().setTheme('darkBlack');
            expect(localStorageMock.setItem).toHaveBeenCalledWith('settings-theme', 'darkBlack');
        });
    });
});
