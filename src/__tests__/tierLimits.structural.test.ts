/**
 * Tier Limits Wiring — Structural Test
 *
 * Enforces at CI that all guard hooks remain wired to the tier limits system.
 * Fails if any guard is accidentally removed or server-side protection bypassed.
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import { FREE_TIER_LIMITS } from '@/features/subscription/types/tierLimits';

const SRC = join(process.cwd(), 'src');
const FUNCS = join(process.cwd(), 'functions', 'src');

function readSrc(relPath: string): string {
    const full = join(SRC, relPath);
    if (!existsSync(full)) throw new Error(`Missing: ${relPath}`);
    return readFileSync(full, 'utf-8');
}

function readFn(relPath: string): string {
    const full = join(FUNCS, relPath);
    if (!existsSync(full)) throw new Error(`Missing: ${relPath}`);
    return readFileSync(full, 'utf-8');
}

// ── FREE_TIER_LIMITS constants ─────────────────────────────────────────────────

describe('FREE_TIER_LIMITS — SSOT values', () => {
    it('maxWorkspaces is 5', () => expect(FREE_TIER_LIMITS.maxWorkspaces).toBe(5));
    it('maxNodesPerWorkspace is 12', () => expect(FREE_TIER_LIMITS.maxNodesPerWorkspace).toBe(12));
    it('maxAiGenerationsPerDay is 60', () => expect(FREE_TIER_LIMITS.maxAiGenerationsPerDay).toBe(60));
    it('maxStorageMb is 50', () => expect(FREE_TIER_LIMITS.maxStorageMb).toBe(50));
});

// ── Client guard wiring ────────────────────────────────────────────────────────

describe('Client guard wiring', () => {
    it('useAddNode imports useNodeCreationGuard', () => {
        expect(readSrc('features/canvas/hooks/useAddNode.ts')).toContain('useNodeCreationGuard');
    });

    it('useNodeGeneration guards aiDaily before calling generateContentWithContext', () => {
        const content = readSrc('features/ai/hooks/useNodeGeneration.ts');
        expect(content).toContain("check('aiDaily')");
        // Guard must appear before the actual call site (not just the import)
        expect(content).toContain('generateContentWithContext(');
        expect(content.indexOf("check('aiDaily')")).toBeLessThan(
            content.indexOf('generateContentWithContext('),
        );
    });

    it('useIdeaCardDuplicateAction imports useNodeCreationGuard', () => {
        expect(readSrc('features/canvas/hooks/useIdeaCardDuplicateAction.ts')).toContain(
            'useNodeCreationGuard',
        );
    });

    it('useNodeGeneration dispatches AI_GENERATED after generation', () => {
        expect(readSrc('features/ai/hooks/useNodeGeneration.ts')).toContain('AI_GENERATED');
    });
});

// ── Server-side AI daily guard ─────────────────────────────────────────────────

describe('Server-side AI daily guard', () => {
    it('geminiProxy calls checkAndIncrementDailyAi', () => {
        expect(readFn('geminiProxy.ts')).toContain('checkAndIncrementDailyAi');
    });

    it('geminiProxy uses AI_DAILY_FREE_LIMIT constant', () => {
        expect(readFn('geminiProxy.ts')).toContain('AI_DAILY_FREE_LIMIT');
    });
});

// ── Firestore security rules ───────────────────────────────────────────────────

describe('Firestore /usage/ security rules', () => {
    const rules = readFileSync(join(process.cwd(), 'firestore.rules'), 'utf-8');

    it('aiDaily writes are blocked at rule level', () => {
        expect(rules).toContain('usage/aiDaily');
        expect(rules).toContain('allow write: if false');
    });

    it('storage allows authenticated owner read+write', () => {
        expect(rules).toContain('usage/storage');
        expect(rules).toContain('allow read, write:');
    });
});
