/**
 * Shared test helpers for Escape key layer tests.
 */
import { fireEvent } from '@testing-library/dom';

/** Simulate pressing the Escape key on the document. */
export function pressEscape(): void {
    fireEvent.keyDown(document, { key: 'Escape' });
}
