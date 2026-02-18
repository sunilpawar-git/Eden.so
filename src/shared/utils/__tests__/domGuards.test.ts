/**
 * domGuards — Unit tests for shared DOM guard utilities
 */
import { describe, it, expect } from 'vitest';
import { isEditableTarget } from '../domGuards';

function makeEvent(tagName: string, contentEditable = 'inherit'): KeyboardEvent {
    const el = document.createElement(tagName);
    if (contentEditable !== 'inherit') {
        el.contentEditable = contentEditable;
    }
    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true });
    Object.defineProperty(event, 'target', { value: el });
    return event;
}

describe('isEditableTarget', () => {
    it('returns true for INPUT elements', () => {
        expect(isEditableTarget(makeEvent('input'))).toBe(true);
    });

    it('returns true for TEXTAREA elements', () => {
        expect(isEditableTarget(makeEvent('textarea'))).toBe(true);
    });

    it('returns true for contentEditable elements', () => {
        expect(isEditableTarget(makeEvent('div', 'true'))).toBe(true);
    });

    it('returns false for non-editable DIV', () => {
        expect(isEditableTarget(makeEvent('div'))).toBe(false);
    });

    it('returns false for BUTTON elements', () => {
        expect(isEditableTarget(makeEvent('button'))).toBe(false);
    });

    it('returns false when target is null', () => {
        const event = new KeyboardEvent('keydown', { key: 'a' });
        Object.defineProperty(event, 'target', { value: null });
        expect(isEditableTarget(event)).toBe(false);
    });
});
