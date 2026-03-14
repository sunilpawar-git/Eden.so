/**
 * Grid Columns Resolver — Unit tests for resolving column preferences
 * Covers: fixed values, 'auto' mode, edge cases, boundary clamping,
 * and the DOM-aware resolveGridColumnsFromStore helper.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveGridColumns, resolveGridColumnsFromStore, VALID_GRID_COLUMNS, CANVAS_CONTAINER_SELECTOR } from '../gridColumnsResolver';
import type { GridColumnsPreference } from '../gridColumnsResolver';
import { useSettingsStore } from '@/shared/stores/settingsStore';

vi.mock('@/shared/services/analyticsService', () => ({
    trackSettingsChanged: vi.fn(),
}));

describe('resolveGridColumns', () => {
    describe('fixed column preferences', () => {
        it.each([2, 3, 4, 5, 6] as const)('returns %d when preference is %d', (n) => {
            expect(resolveGridColumns(n)).toBe(n);
        });

        it('does not depend on viewportWidth for fixed values', () => {
            expect(resolveGridColumns(3, 5000)).toBe(3);
            expect(resolveGridColumns(3, 100)).toBe(3);
        });
    });

    describe('auto mode', () => {
        it('returns 4 when viewportWidth is undefined', () => {
            expect(resolveGridColumns('auto')).toBe(4);
        });

        it('returns 4 when viewportWidth is 0', () => {
            expect(resolveGridColumns('auto', 0)).toBe(4);
        });

        it('returns 4 when viewportWidth is negative', () => {
            expect(resolveGridColumns('auto', -500)).toBe(4);
        });

        it('returns 2 for narrow viewport (700px)', () => {
            expect(resolveGridColumns('auto', 700)).toBe(2);
        });

        it('returns 3 for medium viewport (1024px)', () => {
            expect(resolveGridColumns('auto', 1024)).toBe(3);
        });

        it('returns 4 for standard viewport (1440px)', () => {
            expect(resolveGridColumns('auto', 1440)).toBe(4);
        });

        it('returns 5 for wide viewport (1920px)', () => {
            expect(resolveGridColumns('auto', 1920)).toBe(5);
        });

        it('returns 6 for ultra-wide viewport (2560px)', () => {
            expect(resolveGridColumns('auto', 2560)).toBe(6);
        });

        it('clamps to 6 for very wide viewport (4000px)', () => {
            expect(resolveGridColumns('auto', 4000)).toBe(6);
        });

        it('clamps to 2 for very narrow viewport (400px)', () => {
            expect(resolveGridColumns('auto', 400)).toBe(2);
        });
    });

    describe('VALID_GRID_COLUMNS constant', () => {
        it('contains auto and numbers 2-6', () => {
            expect(VALID_GRID_COLUMNS).toEqual(['auto', 2, 3, 4, 5, 6]);
        });

        it('has 6 entries', () => {
            expect(VALID_GRID_COLUMNS).toHaveLength(6);
        });

        it('each entry is a valid GridColumnsPreference', () => {
            const valid: GridColumnsPreference[] = ['auto', 2, 3, 4, 5, 6];
            for (const v of VALID_GRID_COLUMNS) {
                expect(valid).toContain(v);
            }
        });
    });
});

describe('resolveGridColumnsFromStore', () => {
    let containerDiv: HTMLDivElement;

    beforeEach(() => {
        useSettingsStore.setState({ gridColumns: 4 });
        containerDiv = document.createElement('div');
        containerDiv.setAttribute('data-canvas-container', '');
    });

    afterEach(() => {
        containerDiv.remove();
    });

    it('returns fixed column count for non-auto preference', () => {
        useSettingsStore.setState({ gridColumns: 5 });
        expect(resolveGridColumnsFromStore()).toBe(5);
    });

    it('reads container width for auto mode', () => {
        useSettingsStore.setState({ gridColumns: 'auto' });
        Object.defineProperty(containerDiv, 'clientWidth', { value: 1920, configurable: true });
        document.body.appendChild(containerDiv);

        expect(resolveGridColumnsFromStore()).toBe(5);
    });

    it('falls back to 4 when no container exists in auto mode', () => {
        useSettingsStore.setState({ gridColumns: 'auto' });
        expect(resolveGridColumnsFromStore()).toBe(4);
    });

    it('exports CANVAS_CONTAINER_SELECTOR', () => {
        expect(CANVAS_CONTAINER_SELECTOR).toBe('[data-canvas-container]');
    });
});
