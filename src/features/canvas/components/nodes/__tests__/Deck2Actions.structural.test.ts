/**
 * Deck2Actions structural test — exhaustiveness guard.
 * Verifies every action ID in DEFAULT_UTILS_BAR_LAYOUT.deck2 has a renderer
 * in DECK2_RENDERERS. Prevents silent null renders when new actions are added.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';
import { DEFAULT_UTILS_BAR_LAYOUT } from '../../../types/utilsBarLayout';

const DECK2_SRC = readFileSync(
    resolve(__dirname, '../Deck2Actions.tsx'),
    'utf-8'
);

describe('Deck2Actions — renderer exhaustiveness', () => {
    it('every deck-2 action ID has an entry in DECK2_RENDERERS', () => {
        // Extract keys listed in the DECK2_RENDERERS object literal from source
        const regex = /const DECK2_RENDERERS[^=]+=\s*\{([^}]+)\}/s;
        const match = regex.exec(DECK2_SRC);
        expect(match, 'DECK2_RENDERERS literal not found in source').toBeTruthy();

        const body = match?.[1];
        expect(body, 'DECK2_RENDERERS body not found').toBeTruthy();
        // Collect all keys: lines like `    tags: renderTags,`
        const rendererKeys = [...body!.matchAll(/^\s+(\w+):/gm)].map((m) => m[1]);

        for (const actionId of DEFAULT_UTILS_BAR_LAYOUT.deck2) {
            expect(
                rendererKeys,
                `DECK2_RENDERERS is missing a renderer for action "${actionId}". ` +
                `Add a renderer or move the action to deck 1.`
            ).toContain(actionId);
        }
    });

    it('DECK2_RENDERERS has no extra keys not in deck-2 layout', () => {
        const regex = /const DECK2_RENDERERS[^=]+=\s*\{([^}]+)\}/s;
        const match = regex.exec(DECK2_SRC);
        expect(match).toBeTruthy();
        const body = match?.[1];
        expect(body, 'DECK2_RENDERERS body not found').toBeTruthy();
        const rendererKeys = [...body!.matchAll(/^\s+(\w+):/gm)].map((m) => m[1]);
        const deck2Set = new Set(DEFAULT_UTILS_BAR_LAYOUT.deck2);

        for (const key of rendererKeys) {
            expect(
                deck2Set.has(key as never),
                `DECK2_RENDERERS has key "${key}" which is not in DEFAULT_UTILS_BAR_LAYOUT.deck2. ` +
                `Remove it or add the action to the deck-2 layout.`
            ).toBe(true);
        }
    });
});
