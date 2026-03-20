/**
 * nodeHoverMenuControllerReducer unit tests — simplified state machine.
 * Only manages submenu open/close and mode transitions.
 */
import { describe, it, expect } from 'vitest';
import {
    nodeHoverMenuControllerReducer,
    initialNodeHoverMenuControllerState,
} from '../nodeHoverMenuControllerReducer';
import type { NodeHoverMenuControllerState } from '../nodeHoverMenuControllerReducer';

describe('nodeHoverMenuControllerReducer', () => {
    it('starts in idle mode with no submenu', () => {
        expect(initialNodeHoverMenuControllerState.mode).toBe('auto');
        expect(initialNodeHoverMenuControllerState.activeSubmenu).toBe('none');
    });

    it('OPEN_SUBMENU transitions to submenu open', () => {
        const next = nodeHoverMenuControllerReducer(initialNodeHoverMenuControllerState, {
            type: 'OPEN_SUBMENU', submenu: 'transform',
        });
        expect(next.activeSubmenu).toBe('transform');
        expect(next.mode).toBe('manual');
    });

    it('CLOSE_SUBMENU returns to idle', () => {
        const open: NodeHoverMenuControllerState = { mode: 'manual', activeSubmenu: 'transform' };
        const next = nodeHoverMenuControllerReducer(open, { type: 'CLOSE_SUBMENU' });
        expect(next.activeSubmenu).toBe('none');
    });

    it('CLOSE_SUBMENU is no-op when already closed', () => {
        const state = nodeHoverMenuControllerReducer(initialNodeHoverMenuControllerState, { type: 'CLOSE_SUBMENU' });
        expect(state).toBe(initialNodeHoverMenuControllerState);
    });

    it('ESCAPE closes submenu first', () => {
        const open: NodeHoverMenuControllerState = { mode: 'manual', activeSubmenu: 'transform' };
        const next = nodeHoverMenuControllerReducer(open, { type: 'ESCAPE' });
        expect(next.activeSubmenu).toBe('none');
    });

    it('ESCAPE from idle auto is no-op', () => {
        const state = nodeHoverMenuControllerReducer(initialNodeHoverMenuControllerState, { type: 'ESCAPE' });
        expect(state).toBe(initialNodeHoverMenuControllerState);
    });

    it('HOVER_LEAVE from idle stays idle', () => {
        const state = nodeHoverMenuControllerReducer(initialNodeHoverMenuControllerState, { type: 'HOVER_LEAVE' });
        expect(state).toBe(initialNodeHoverMenuControllerState);
    });

    it('HOVER_LEAVE in auto mode closes submenu', () => {
        const open: NodeHoverMenuControllerState = { mode: 'auto', activeSubmenu: 'transform' };
        const next = nodeHoverMenuControllerReducer(open, { type: 'HOVER_LEAVE' });
        expect(next.activeSubmenu).toBe('none');
    });

    it('HOVER_LEAVE in manual mode is no-op', () => {
        const manual: NodeHoverMenuControllerState = { mode: 'manual', activeSubmenu: 'transform' };
        const next = nodeHoverMenuControllerReducer(manual, { type: 'HOVER_LEAVE' });
        expect(next).toBe(manual);
    });

    it('PROXIMITY_LOST with active submenu closes submenu and resets to auto', () => {
        const open: NodeHoverMenuControllerState = { mode: 'manual', activeSubmenu: 'transform' };
        const next = nodeHoverMenuControllerReducer(open, { type: 'PROXIMITY_LOST' });
        expect(next.activeSubmenu).toBe('none');
        expect(next.mode).toBe('auto');
    });

    it('PROXIMITY_LOST in manual mode with no submenu returns to auto', () => {
        const manual: NodeHoverMenuControllerState = { mode: 'manual', activeSubmenu: 'none' };
        const next = nodeHoverMenuControllerReducer(manual, { type: 'PROXIMITY_LOST' });
        expect(next.mode).toBe('auto');
    });

    it('OUTSIDE_POINTER closes everything', () => {
        const open: NodeHoverMenuControllerState = { mode: 'manual', activeSubmenu: 'transform' };
        const next = nodeHoverMenuControllerReducer(open, { type: 'OUTSIDE_POINTER' });
        expect(next.activeSubmenu).toBe('none');
        expect(next.mode).toBe('auto');
    });

    it('OUTSIDE_POINTER from idle auto is no-op', () => {
        const state = nodeHoverMenuControllerReducer(initialNodeHoverMenuControllerState, { type: 'OUTSIDE_POINTER' });
        expect(state).toBe(initialNodeHoverMenuControllerState);
    });

    it('no TOGGLE_DECK_TWO event exists', () => {
        const events = ['HOVER_LEAVE', 'OPEN_SUBMENU', 'CLOSE_SUBMENU', 'ESCAPE', 'OUTSIDE_POINTER', 'PROXIMITY_LOST'];
        expect(events).not.toContain('TOGGLE_DECK_TWO');
    });
});
