/**
 * ColorMenu.proximityLost.test.tsx — Regression test for the color-picker vanishing bug.
 *
 * Root cause: PROXIMITY_LOST was combined with OUTSIDE_POINTER in the reducer and
 * unconditionally set activeSubmenu:'none', unmounting the portal before the user
 * could click a color option.
 *
 * Fix: PROXIMITY_LOST now returns state unchanged when activeSubmenu !== 'none'.
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act, render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import {
    nodeUtilsControllerReducer,
    initialNodeUtilsControllerState,
    NODE_UTILS_PORTAL_ATTR,
} from '../../../hooks/nodeUtilsControllerReducer';
import { useNodeUtilsController } from '../../../hooks/useNodeUtilsController';
import { ColorMenu } from '../ColorMenu';

// ---------------------------------------------------------------------------
// Reducer-level invariants (fast, no DOM)
// ---------------------------------------------------------------------------
describe('ColorMenu portal — PROXIMITY_LOST reducer invariants', () => {
    it('state is unchanged when PROXIMITY_LOST fires while color menu is open', () => {
        const withColorOpen = {
            ...initialNodeUtilsControllerState,
            isDeckTwoOpen: true,
            mode: 'manual' as const,
            activeSubmenu: 'color' as const,
        };
        const next = nodeUtilsControllerReducer(withColorOpen, { type: 'PROXIMITY_LOST' });
        expect(next).toBe(withColorOpen);
        expect(next.activeSubmenu).toBe('color');
    });

    it('OUTSIDE_POINTER still closes color menu (intentional click-outside)', () => {
        const withColorOpen = {
            ...initialNodeUtilsControllerState,
            isDeckTwoOpen: true,
            mode: 'manual' as const,
            activeSubmenu: 'color' as const,
        };
        const next = nodeUtilsControllerReducer(withColorOpen, { type: 'OUTSIDE_POINTER' });
        expect(next.activeSubmenu).toBe('none');
        expect(next.isDeckTwoOpen).toBe(false);
        expect(next.mode).toBe('auto');
    });

    it('ESCAPE first closes the submenu, leaving deck two open', () => {
        const withColorOpen = {
            ...initialNodeUtilsControllerState,
            isDeckTwoOpen: true,
            mode: 'manual' as const,
            activeSubmenu: 'color' as const,
        };
        const afterEscape = nodeUtilsControllerReducer(withColorOpen, { type: 'ESCAPE' });
        expect(afterEscape.activeSubmenu).toBe('none');
        expect(afterEscape.isDeckTwoOpen).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Hook-level: PROXIMITY_LOST does not dismiss an open color menu
// ---------------------------------------------------------------------------
describe('useNodeUtilsController — color submenu survives proximity lost', () => {
    it('color submenu stays open after handleProximityLost', () => {
        const { result } = renderHook(() => useNodeUtilsController());
        act(() => { result.current.actions.openSubmenu('color'); });
        expect(result.current.state.activeSubmenu).toBe('color');

        act(() => { result.current.actions.handleProximityLost(); });
        expect(result.current.state.activeSubmenu).toBe('color');
    });

    it('CLOSE_SUBMENU dismisses the color menu after a selection', () => {
        const { result } = renderHook(() => useNodeUtilsController());
        act(() => { result.current.actions.openSubmenu('color'); });
        act(() => { result.current.actions.handleProximityLost(); });
        // Simulates clicking a color: ColorMenu calls onClose → closeSubmenu
        act(() => { result.current.actions.closeSubmenu(); });
        expect(result.current.state.activeSubmenu).toBe('none');
    });

    it('onOutsidePointer still dismisses color menu (click elsewhere)', () => {
        const { result } = renderHook(() => useNodeUtilsController());
        act(() => { result.current.actions.openSubmenu('color'); });
        act(() => { result.current.actions.handleProximityLost(); });
        act(() => { result.current.actions.onOutsidePointer(); });
        expect(result.current.state.activeSubmenu).toBe('none');
        expect(result.current.state.isDeckTwoOpen).toBe(false);
    });

    it('onEscape dismisses color menu', () => {
        const { result } = renderHook(() => useNodeUtilsController());
        act(() => { result.current.actions.openSubmenu('color'); });
        act(() => { result.current.actions.handleProximityLost(); });
        act(() => { result.current.actions.onEscape(); });
        expect(result.current.state.activeSubmenu).toBe('none');
    });
});

// ---------------------------------------------------------------------------
// Component-level: ColorMenu portal attribute is set (guards OUTSIDE_POINTER)
// ---------------------------------------------------------------------------
describe('ColorMenu portal — NODE_UTILS_PORTAL_ATTR is present', () => {
    function Wrapper() {
        const [isOpen, setIsOpen] = useState(true);
        return (
            <ColorMenu
                isOpen={isOpen}
                onToggle={() => { setIsOpen((p) => !p); }}
                onClose={() => { setIsOpen(false); }}
                selectedColorKey="default"
                onColorSelect={() => undefined}
            />
        );
    }

    it('portal has data-node-utils-zone="true" so OUTSIDE_POINTER handler ignores it', () => {
        render(<Wrapper />);
        const portal = screen.getByTestId('color-menu-portal');
        expect(portal).toHaveAttribute(NODE_UTILS_PORTAL_ATTR, 'true');
    });

    it('clicking a color option closes the menu via onClose', () => {
        render(<Wrapper />);
        fireEvent.click(screen.getByText('Red (Attention)'));
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
});
