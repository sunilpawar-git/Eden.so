/**
 * nodeUtilsControllerReducer unit tests — TDD for PROXIMITY_LOST fix.
 *
 * Key invariant:
 *  PROXIMITY_LOST  → no-op when a submenu portal is open (user is moving to interact with it)
 *  OUTSIDE_POINTER → always closes everything (click-outside is always intentional)
 */
import { describe, it, expect } from 'vitest';
import { nodeUtilsControllerReducer } from '../nodeUtilsControllerReducer';

describe('nodeUtilsControllerReducer – PROXIMITY_LOST vs OUTSIDE_POINTER semantics', () => {
    it('PROXIMITY_LOST with activeSubmenu="color" returns state unchanged (portal must stay accessible)', () => {
        const state = {
            isDeckTwoOpen: true,
            mode: 'manual' as const,
            activeSubmenu: 'color' as const,
        };
        const next = nodeUtilsControllerReducer(state, { type: 'PROXIMITY_LOST' });
        // The color picker portal lives in document.body — we must NOT unmount it
        expect(next).toBe(state);
    });

    it('PROXIMITY_LOST with activeSubmenu="none" closes deck two (no portal active)', () => {
        const state = {
            isDeckTwoOpen: true,
            mode: 'manual' as const,
            activeSubmenu: 'none' as const,
        };
        const next = nodeUtilsControllerReducer(state, { type: 'PROXIMITY_LOST' });
        expect(next.isDeckTwoOpen).toBe(false);
        expect(next.mode).toBe('auto');
        // activeSubmenu was already 'none' — stays 'none'
        expect(next.activeSubmenu).toBe('none');
    });

    it('OUTSIDE_POINTER with activeSubmenu="color" closes everything (click-outside is intentional)', () => {
        const state = {
            isDeckTwoOpen: true,
            mode: 'manual' as const,
            activeSubmenu: 'color' as const,
        };
        const next = nodeUtilsControllerReducer(state, { type: 'OUTSIDE_POINTER' });
        expect(next.isDeckTwoOpen).toBe(false);
        expect(next.activeSubmenu).toBe('none');
        expect(next.mode).toBe('auto');
    });
});
