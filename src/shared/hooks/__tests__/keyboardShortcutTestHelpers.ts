/**
 * Shared test helper for keyboard shortcut test files.
 * SSOT: avoids duplicating fireKeyDown across test suites.
 */

export const fireKeyDown = (key: string, options: Partial<KeyboardEvent> = {}) => {
    const event = new KeyboardEvent('keydown', {
        key, bubbles: true, cancelable: true, ...options,
    });
    document.dispatchEvent(event);
    return event;
};
