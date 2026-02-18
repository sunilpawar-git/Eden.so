/**
 * Sidebar Store Tests — pin/unpin state management
 * TDD: Written BEFORE implementation (Red phase)
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createLocalStorageMock } from './helpers/settingsTestSetup';

const localStorageMock = createLocalStorageMock();

describe('SidebarStore', () => {
    beforeEach(() => {
        vi.resetModules();
        localStorageMock.clear();
        vi.stubGlobal('localStorage', localStorageMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    async function getStore() {
        const { useSidebarStore } = await import('../sidebarStore');
        return useSidebarStore;
    }

    describe('initial state', () => {
        it('should default isPinned to true', async () => {
            const store = await getStore();
            expect(store.getState().isPinned).toBe(true);
        });

        it('should default isHoverOpen to false', async () => {
            const store = await getStore();
            expect(store.getState().isHoverOpen).toBe(false);
        });
    });

    describe('togglePin', () => {
        it('should toggle isPinned from true to false', async () => {
            const store = await getStore();
            expect(store.getState().isPinned).toBe(true);
            store.getState().togglePin();
            expect(store.getState().isPinned).toBe(false);
        });

        it('should toggle isPinned from false back to true', async () => {
            const store = await getStore();
            store.getState().togglePin();
            store.getState().togglePin();
            expect(store.getState().isPinned).toBe(true);
        });

        it('should reset isHoverOpen to false when toggling', async () => {
            const store = await getStore();
            store.getState().togglePin();
            store.getState().setHoverOpen(true);
            expect(store.getState().isHoverOpen).toBe(true);
            store.getState().togglePin();
            expect(store.getState().isHoverOpen).toBe(false);
        });

        it('should persist isPinned to localStorage', async () => {
            const store = await getStore();
            store.getState().togglePin();
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'sidebar-isPinned',
                'false'
            );
        });
    });

    describe('setHoverOpen', () => {
        it('should set isHoverOpen to true when unpinned', async () => {
            const store = await getStore();
            store.getState().togglePin();
            store.getState().setHoverOpen(true);
            expect(store.getState().isHoverOpen).toBe(true);
        });

        it('should set isHoverOpen to false when unpinned', async () => {
            const store = await getStore();
            store.getState().togglePin();
            store.getState().setHoverOpen(true);
            store.getState().setHoverOpen(false);
            expect(store.getState().isHoverOpen).toBe(false);
        });

        it('should NOT set isHoverOpen when pinned (guard)', async () => {
            const store = await getStore();
            expect(store.getState().isPinned).toBe(true);
            store.getState().setHoverOpen(true);
            expect(store.getState().isHoverOpen).toBe(false);
        });
    });

    describe('localStorage persistence', () => {
        it('should default to true when localStorage is empty', async () => {
            const store = await getStore();
            expect(store.getState().isPinned).toBe(true);
        });

        it('should read isPinned from localStorage on init', async () => {
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'sidebar-isPinned') return 'false';
                return null;
            });
            const store = await getStore();
            expect(store.getState().isPinned).toBe(false);
        });
    });

    describe('security - defense in depth', () => {
        it('should default to true for invalid localStorage value', async () => {
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'sidebar-isPinned') return '<script>alert(1)</script>';
                return null;
            });
            const store = await getStore();
            expect(store.getState().isPinned).toBe(true);
        });

        it('should not persist isHoverOpen (transient state)', async () => {
            const store = await getStore();
            store.getState().togglePin();
            localStorageMock.setItem.mockClear();
            store.getState().setHoverOpen(true);
            const calls = localStorageMock.setItem.mock.calls;
            const hoverCalls = calls.filter(
                (c: string[]) => c[0] === 'sidebar-isHoverOpen'
            );
            expect(hoverCalls).toHaveLength(0);
        });
    });
});
