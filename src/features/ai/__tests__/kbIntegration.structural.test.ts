/**
 * Structural test: Knowledge Bank integration in AI hooks
 *
 * Verifies that every AI generation hook that calls geminiService
 * also imports and uses Knowledge Bank context. Prevents regressions
 * where a new generation path is added without KB wiring.
 */
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const HOOKS_DIR = resolve(__dirname, '../hooks');

/** AI service functions that accept KB context */
const KB_AWARE_FUNCTIONS = [
    'generateContent',
    'generateContentWithContext',
    'transformContent',
];

function getHookFiles(): string[] {
    return readdirSync(HOOKS_DIR)
        .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
}

function readHook(filename: string): string {
    return readFileSync(resolve(HOOKS_DIR, filename), 'utf-8');
}

/** Check if a hook file calls any KB-aware AI service function */
function callsAIService(source: string): boolean {
    return KB_AWARE_FUNCTIONS.some((fn) =>
        new RegExp(`\\b${fn}\\s*\\(`).test(source)
    );
}

/** Check if a hook file imports useKnowledgeBankContext */
function importsKBContext(source: string): boolean {
    return source.includes('useKnowledgeBankContext');
}

/** Check if a hook file calls getKBContext() */
function usesKBContext(source: string): boolean {
    return /\bgetKBContext\b/.test(source);
}

describe('KB context wiring in AI hooks', () => {
    const hookFiles = getHookFiles();
    const aiHooks = hookFiles.filter((f) => callsAIService(readHook(f)));

    it('should find at least one AI hook that calls geminiService', () => {
        expect(aiHooks.length).toBeGreaterThanOrEqual(1);
    });

    it.each(aiHooks)(
        '%s must import useKnowledgeBankContext',
        (filename) => {
            const source = readHook(filename);
            expect(
                importsKBContext(source),
                `${filename} calls an AI service function but does not import useKnowledgeBankContext. ` +
                `KB entries will be silently ignored during generation.`
            ).toBe(true);
        }
    );

    it.each(aiHooks)(
        '%s must call getKBContext()',
        (filename) => {
            const source = readHook(filename);
            expect(
                usesKBContext(source),
                `${filename} imports KB context but never calls getKBContext(). ` +
                `KB entries will not be passed to the AI service.`
            ).toBe(true);
        }
    );
});
