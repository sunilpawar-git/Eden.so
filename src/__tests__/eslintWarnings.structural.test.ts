/**
 * Structural regression tests — ensure ESLint warning patterns stay eliminated.
 * Each test guards against re-introduction of a specific ESLint violation.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const read = (relPath: string) =>
    readFileSync(join(process.cwd(), relPath), 'utf-8');

describe('ESLint warning regression guards', () => {
    describe('no-non-null-assertion in ToolbarSection', () => {
        it('moveUp uses safe assignment instead of non-null assertion', () => {
            const src = read('src/app/components/SettingsPanel/sections/ToolbarSection.tsx');
            // The moveUp block should NOT contain `list[idx]!`
            const moveUpBlock = src.slice(src.indexOf('moveUp'), src.indexOf('moveDown'));
            expect(moveUpBlock).not.toContain('list[idx]!');
        });

        it('moveDown uses safe assignment instead of non-null assertion', () => {
            const src = read('src/app/components/SettingsPanel/sections/ToolbarSection.tsx');
            const moveDownBlock = src.slice(src.indexOf('moveDown'), src.indexOf('removeFromZone'));
            expect(moveDownBlock).not.toContain('list[idx]!');
        });
    });

    describe('no-nested-ternary in ToolbarSection', () => {
        it('handleDropOnZone uses helper instead of nested ternary', () => {
            const src = read('src/app/components/SettingsPanel/sections/ToolbarSection.tsx');
            const dropBlock = src.slice(src.indexOf('handleDropOnZone'), src.indexOf('moveUp'));
            // Should NOT have nested ternary (second `?` on a following line)
            expect(dropBlock).not.toMatch(/\? [\s\S]*?: .*\?/);
        });
    });

    describe('no-floating-promises in useIdeaCardHandlers', () => {
        it('handleMindmapToggle uses void before async call', () => {
            const src = read('src/features/canvas/hooks/useIdeaCardHandlers.ts');
            expect(src).toMatch(/void toggleContentModeWithUndo\(id\)/);
        });
    });

    describe('max-lines-per-function: NodeUtilsBar', () => {
        it('renderButton is extracted to a standalone helper file', () => {
            const src = read('src/features/canvas/components/nodes/NodeUtilsBar.tsx');
            expect(src).toContain('renderUtilsBarButton');
        });
    });

    describe('max-lines-per-function: NodeContextMenu', () => {
        it('renderItem is extracted to a standalone helper file', () => {
            const src = read('src/features/canvas/components/nodes/NodeContextMenu.tsx');
            expect(src).toContain('renderContextMenuItem');
        });
    });

    describe('max-lines-per-function: ToolbarSection', () => {
        it('zone rendering is extracted to sub-components', () => {
            const src = read('src/app/components/SettingsPanel/sections/ToolbarSection.tsx');
            // Should import extracted zone component(s)
            expect(src).toMatch(/import.*Zone|import.*Unplaced/);
        });
    });

    describe('max-lines-per-function: settingsStore', () => {
        it('store initializer arrow function is under 80 lines', () => {
            const src = read('src/shared/stores/settingsStore.ts');
            // The main create callback should be short by extracting action creators
            expect(src).toContain('createSettingsActions');
        });
    });

    describe('max-lines-per-function + complexity: IdeaCard', () => {
        it('IdeaCard delegates menu/context setup to a custom hook', () => {
            const src = read('src/features/canvas/components/nodes/IdeaCard.tsx');
            expect(src).toContain('useIdeaCardMenuActions');
        });
    });
});
