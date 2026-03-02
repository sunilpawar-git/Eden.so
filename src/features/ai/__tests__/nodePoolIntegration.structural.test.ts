/**
 * Structural test: Node Pool integration in AI hooks
 *
 * Verifies that every AI generation hook that calls geminiService
 * also imports and uses Node Pool context. Prevents regressions
 * where a new generation path is added without pool wiring.
 * Mirrors kbIntegration.structural.test.ts for consistency.
 */
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const HOOKS_DIR = resolve(__dirname, '../hooks');

const POOL_AWARE_FUNCTIONS = [
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

function callsAIService(source: string): boolean {
    return POOL_AWARE_FUNCTIONS.some((fn) =>
        new RegExp(`\\b${fn}\\s*\\(`).test(source)
    );
}

function importsPoolContext(source: string): boolean {
    return source.includes('useNodePoolContext');
}

function usesPoolContext(source: string): boolean {
    return /\bgetPoolContext\b/.test(source);
}

describe('Node Pool context wiring in AI hooks', () => {
    const hookFiles = getHookFiles();
    const aiHooks = hookFiles.filter((f) => callsAIService(readHook(f)));

    it('should find at least one AI hook that calls geminiService', () => {
        expect(aiHooks.length).toBeGreaterThanOrEqual(1);
    });

    it.each(aiHooks)(
        '%s must import useNodePoolContext',
        (filename) => {
            const source = readHook(filename);
            expect(
                importsPoolContext(source),
                `${filename} calls an AI service function but does not import useNodePoolContext. ` +
                `Pooled nodes will be silently ignored during generation.`
            ).toBe(true);
        }
    );

    it.each(aiHooks)(
        '%s must call getPoolContext()',
        (filename) => {
            const source = readHook(filename);
            expect(
                usesPoolContext(source),
                `${filename} imports pool context but never calls getPoolContext(). ` +
                `Pooled nodes will not be passed to the AI service.`
            ).toBe(true);
        }
    );
});
