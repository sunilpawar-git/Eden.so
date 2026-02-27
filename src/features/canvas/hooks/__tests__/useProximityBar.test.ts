/**
 * useProximityBar — Unit tests for ref-based proximity detection.
 * Verifies DOM data attributes are set without React state changes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProximityBar } from '../useProximityBar';

function createMockElement(): HTMLDivElement {
    const el = document.createElement('div');
    document.body.appendChild(el);
    return el;
}

describe('useProximityBar', () => {
    let card: HTMLDivElement;
    let bar: HTMLDivElement;

    beforeEach(() => {
        card = createMockElement();
        bar = createMockElement();
        vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({
            left: 100, right: 500, top: 100, bottom: 300,
            width: 400, height: 200, x: 100, y: 100, toJSON: () => ({}),
        });
    });

    afterEach(() => {
        card.remove();
        bar.remove();
    });

    it('sets data-bar-placement="right" by default', () => {
        const cardRef = { current: card };
        const barRef = { current: bar };
        renderHook(() => useProximityBar(cardRef, barRef));

        expect(card.getAttribute('data-bar-placement')).toBe('right');
    });

    it('sets data-hovered="true" on mouseenter', () => {
        const cardRef = { current: card };
        const barRef = { current: bar };
        renderHook(() => useProximityBar(cardRef, barRef));

        card.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        expect(card.getAttribute('data-hovered')).toBe('true');
    });

    it('removes data-hovered on mouseleave', () => {
        const cardRef = { current: card };
        const barRef = { current: bar };
        renderHook(() => useProximityBar(cardRef, barRef));

        card.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        card.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
        expect(card.getAttribute('data-hovered')).toBeNull();
    });

    it('sets data-bar-proximity="near" when mouse is within threshold', () => {
        const cardRef = { current: card };
        const barRef = { current: bar };
        renderHook(() => useProximityBar(cardRef, barRef));

        card.dispatchEvent(new MouseEvent('mousemove', { clientX: 450, bubbles: true }));
        expect(card.getAttribute('data-bar-proximity')).toBe('near');
    });

    it('removes data-bar-proximity when mouse is far from edge', () => {
        const cardRef = { current: card };
        const barRef = { current: bar };
        renderHook(() => useProximityBar(cardRef, barRef));

        card.dispatchEvent(new MouseEvent('mousemove', { clientX: 450, bubbles: true }));
        card.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, bubbles: true }));
        expect(card.getAttribute('data-bar-proximity')).toBeNull();
    });

    it('never calls React setState (no re-renders)', () => {
        let renderCount = 0;
        const cardRef = { current: card };
        const barRef = { current: bar };

        renderHook(() => {
            renderCount++;
            useProximityBar(cardRef, barRef);
        });

        const baseline = renderCount;

        card.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        card.dispatchEvent(new MouseEvent('mousemove', { clientX: 450, bubbles: true }));
        card.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, bubbles: true }));
        card.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

        expect(renderCount).toBe(baseline);
    });

    it('cleans up event listeners on unmount', () => {
        const cardRef = { current: card };
        const barRef = { current: bar };
        const removeSpy = vi.spyOn(card, 'removeEventListener');
        const windowRemoveSpy = vi.spyOn(window, 'removeEventListener');

        const { unmount } = renderHook(() => useProximityBar(cardRef, barRef));
        unmount();

        const removedEvents = removeSpy.mock.calls.map(([event]) => event);
        expect(removedEvents).toContain('mouseenter');
        expect(removedEvents).toContain('mousemove');
        expect(removedEvents).toContain('mouseleave');
        expect(removedEvents).toContain('focusin');
        expect(removedEvents).toContain('focusout');

        const windowRemovedEvents = windowRemoveSpy.mock.calls.map(([event]) => event);
        expect(windowRemovedEvents).toContain('resize');
    });

    it('sets data-bar-focused="true" on focusin inside bar', () => {
        const cardRef = { current: card };
        const barRef = { current: bar };
        renderHook(() => useProximityBar(cardRef, barRef));

        const btn = document.createElement('button');
        bar.appendChild(btn);
        card.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget: null }));
        expect(card.getAttribute('data-bar-focused')).toBeNull();

        const focusEvent = new FocusEvent('focusin', { bubbles: true });
        Object.defineProperty(focusEvent, 'target', { value: btn });
        card.dispatchEvent(focusEvent);
        expect(card.getAttribute('data-bar-focused')).toBe('true');
    });

    it('removes data-bar-focused on focusout leaving bar', () => {
        const cardRef = { current: card };
        const barRef = { current: bar };
        renderHook(() => useProximityBar(cardRef, barRef));

        const btn = document.createElement('button');
        bar.appendChild(btn);
        const focusIn = new FocusEvent('focusin', { bubbles: true });
        Object.defineProperty(focusIn, 'target', { value: btn });
        card.dispatchEvent(focusIn);
        expect(card.getAttribute('data-bar-focused')).toBe('true');

        const focusOut = new FocusEvent('focusout', { bubbles: true, relatedTarget: null });
        card.dispatchEvent(focusOut);
        expect(card.getAttribute('data-bar-focused')).toBeNull();
    });

    it('flips data-bar-placement to "left" near viewport right edge', () => {
        const cardRef = { current: card };
        const barRef = { current: bar };

        vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({
            left: 700, right: window.innerWidth - 30, top: 100, bottom: 300,
            width: 400, height: 200, x: 700, y: 100, toJSON: () => ({}),
        });

        renderHook(() => useProximityBar(cardRef, barRef));
        card.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        expect(card.getAttribute('data-bar-placement')).toBe('left');
    });

    it('recalculates placement on window resize', () => {
        const cardRef = { current: card };
        const barRef = { current: bar };
        renderHook(() => useProximityBar(cardRef, barRef));

        vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({
            left: 700, right: window.innerWidth - 30, top: 100, bottom: 300,
            width: 400, height: 200, x: 700, y: 100, toJSON: () => ({}),
        });

        window.dispatchEvent(new Event('resize'));
        expect(card.getAttribute('data-bar-placement')).toBe('left');
    });

    describe('node wrapper z-index elevation', () => {
        function wrapCardInNodeWrapper(cardEl: HTMLDivElement): HTMLDivElement {
            const wrapper = document.createElement('div');
            wrapper.classList.add('react-flow__node');
            wrapper.style.zIndex = '0';
            document.body.appendChild(wrapper);
            wrapper.appendChild(cardEl);
            return wrapper;
        }

        it('sets z-index on .react-flow__node ancestor when proximity is near', () => {
            const nodeWrapper = wrapCardInNodeWrapper(card);
            const cardRef = { current: card };
            const barRef = { current: bar };
            renderHook(() => useProximityBar(cardRef, barRef));

            card.dispatchEvent(new MouseEvent('mousemove', { clientX: 450, bubbles: true }));
            expect(nodeWrapper.style.zIndex).toBe('1001');
            nodeWrapper.remove();
        });

        it('resets z-index on .react-flow__node ancestor when mouse leaves', () => {
            const nodeWrapper = wrapCardInNodeWrapper(card);
            const cardRef = { current: card };
            const barRef = { current: bar };
            renderHook(() => useProximityBar(cardRef, barRef));

            card.dispatchEvent(new MouseEvent('mousemove', { clientX: 450, bubbles: true }));
            expect(nodeWrapper.style.zIndex).toBe('1001');

            card.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
            expect(nodeWrapper.style.zIndex).toBe('');
            nodeWrapper.remove();
        });

        it('does not elevate z-index when cursor is far from edge', () => {
            const nodeWrapper = wrapCardInNodeWrapper(card);
            const cardRef = { current: card };
            const barRef = { current: bar };
            renderHook(() => useProximityBar(cardRef, barRef));

            card.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, bubbles: true }));
            expect(nodeWrapper.style.zIndex).not.toBe('1001');
            nodeWrapper.remove();
        });
    });

    describe('data-bar-deck removed (deck 2 controlled by controller)', () => {
        it('does NOT set data-bar-deck on mousemove', () => {
            const cardRef = { current: card };
            const barRef = { current: bar };
            renderHook(() => useProximityBar(cardRef, barRef));

            card.dispatchEvent(new MouseEvent('mousemove', { clientX: 490, bubbles: true }));
            expect(card.getAttribute('data-bar-proximity')).toBe('near');
            expect(card.getAttribute('data-bar-deck')).toBeNull();

            card.dispatchEvent(new MouseEvent('mousemove', { clientX: 560, bubbles: true }));
            expect(card.getAttribute('data-bar-deck')).toBeNull();
        });
    });
});
