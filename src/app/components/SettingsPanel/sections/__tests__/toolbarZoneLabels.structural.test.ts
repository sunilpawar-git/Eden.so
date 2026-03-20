/**
 * toolbarZoneLabels.structural.test.ts — Guards that toolbar zone labels use the
 * canonical "Hover Menu" / "Right-click Menu" naming throughout the codebase.
 *
 * Prevents accidental reintroduction of the old "UtilsBar" / "Context Menu" labels.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import { strings } from '@/shared/localization/strings';

const SRC = join(process.cwd(), 'src');

function readSrc(relPath: string): string {
    return readFileSync(join(SRC, relPath), 'utf-8');
}

describe('toolbar zone label invariants', () => {
    describe('settingsStrings canonical values', () => {
        it('toolbarHoverMenuZone is "Hover Menu"', () => {
            expect(strings.settings.toolbarHoverMenuZone).toBe('Hover Menu');
        });

        it('toolbarContextMenuZone is "Right-click Menu"', () => {
            expect(strings.settings.toolbarContextMenuZone).toBe('Right-click Menu');
        });

        it('toolbarDescription does not contain legacy label "UtilsBar"', () => {
            expect(strings.settings.toolbarDescription).not.toContain('UtilsBar');
        });

        it('toolbarDescription does not contain legacy label "Context Menu"', () => {
            expect(strings.settings.toolbarDescription).not.toContain('Context Menu');
        });

        it('toolbarMoreButton references Right-click Menu', () => {
            expect(strings.settings.toolbarMoreButton).toContain('Right-click Menu');
        });

        it('toolbarAddToBar is "+ Hover"', () => {
            expect(strings.settings.toolbarAddToBar).toBe('+ Hover');
        });

        it('toolbarAddToMenu is "+ R-click"', () => {
            expect(strings.settings.toolbarAddToMenu).toBe('+ R-click');
        });
    });

    describe('no legacy identifiers in settings store', () => {
        it('settingsStore does not define utilsBarIcons as a state property', () => {
            const content = readSrc('shared/stores/settingsStore.ts');
            // Matches property declaration (utilsBarIcons: or utilsBarIcons?) but NOT the migration
            // string literal ('settings-utilsBarIcons') which is intentional legacy cleanup code.
            expect(content).not.toMatch(/\butilsBarIcons[?:]/);
        });

        it('settingsStore does not define contextMenuIcons as a state property', () => {
            const content = readSrc('shared/stores/settingsStore.ts');
            expect(content).not.toMatch(/\bcontextMenuIcons[?:]/);
        });
    });

    describe('no legacy identifiers in iconRegistry', () => {
        it('iconRegistry does not export UTILS_BAR_MAX', () => {
            const content = readSrc('shared/stores/iconRegistry.ts');
            expect(content).not.toContain('UTILS_BAR_MAX');
        });

        it('iconRegistry does not export CONTEXT_MENU_MAX', () => {
            const content = readSrc('shared/stores/iconRegistry.ts');
            expect(content).not.toContain('CONTEXT_MENU_MAX');
        });

        it('iconRegistry does not export DEFAULT_UTILS_BAR', () => {
            const content = readSrc('shared/stores/iconRegistry.ts');
            expect(content).not.toContain('DEFAULT_UTILS_BAR');
        });

        it('iconRegistry does not export DEFAULT_CONTEXT_MENU', () => {
            const content = readSrc('shared/stores/iconRegistry.ts');
            expect(content).not.toContain('DEFAULT_CONTEXT_MENU');
        });
    });
});
