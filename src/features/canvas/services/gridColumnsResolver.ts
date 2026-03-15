/**
 * Grid Columns Resolver — Pure function to resolve user's column preference
 * into an actual column count for the masonry layout algorithm.
 *
 * SSOT for GridColumnsPreference type and VALID_GRID_COLUMNS constant.
 * Imported by settingsStore.ts and GridColumnsControl.tsx.
 *
 * resolveGridColumnsFromStore() is the canonical entry point for DOM-aware
 * callers — reads the setting and the canvas container width.
 */
import { DEFAULT_NODE_WIDTH } from '../types/node';
import { GRID_GAP, GRID_PADDING } from './gridConstants';
import { useSettingsStore } from '@/shared/stores/settingsStore';

/** User preference: 'auto' computes from viewport, numbers are fixed. */
export type GridColumnsPreference = 'auto' | 2 | 3 | 4 | 5 | 6;

/** Valid values for settings validation (allow-list). */
export const VALID_GRID_COLUMNS: readonly GridColumnsPreference[] = ['auto', 2, 3, 4, 5, 6];

const MIN_COLUMNS = 2;
const MAX_COLUMNS = 6;
const DEFAULT_COLUMN_COUNT = 4;

/** Selector for the canvas container element width (used by 'auto' mode). */
export const CANVAS_CONTAINER_SELECTOR = '[data-canvas-container]';

/**
 * Resolves a user preference into an actual column count.
 *
 * @param preference - 'auto' or a fixed number 2–6
 * @param viewportWidth - Canvas viewport width in pixels (used only for 'auto')
 * @returns Resolved column count clamped to [2, 6]
 */
export function resolveGridColumns(
    preference: GridColumnsPreference,
    viewportWidth?: number,
): number {
    if (preference !== 'auto') {
        return Math.max(MIN_COLUMNS, Math.min(MAX_COLUMNS, preference));
    }

    if (viewportWidth == null || viewportWidth <= 0) {
        return DEFAULT_COLUMN_COUNT;
    }

    const usableWidth = viewportWidth - GRID_PADDING * 2;
    const columnSlot = DEFAULT_NODE_WIDTH + GRID_GAP;
    const computed = Math.floor(usableWidth / columnSlot);

    return Math.max(MIN_COLUMNS, Math.min(MAX_COLUMNS, computed));
}

/**
 * Reads gridColumns from settingsStore and, for 'auto' mode, measures the
 * canvas container's clientWidth via the DOM.
 *
 * DOM-aware — only call from browser context (hooks, callbacks, store actions).
 * For pure/test contexts that already have a viewportWidth, use resolveGridColumns() directly.
 */
export function resolveGridColumnsFromStore(): number {
    const pref = useSettingsStore.getState().gridColumns;
    if (pref !== 'auto') {
        return resolveGridColumns(pref);
    }
    const container = document.querySelector<HTMLElement>(CANVAS_CONTAINER_SELECTOR);
    const viewportWidth = container?.clientWidth ?? 0;
    return resolveGridColumns(pref, viewportWidth);
}
