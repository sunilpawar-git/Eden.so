/**
 * Structural test — KB bundle isolation
 *
 * Asserts that the three KB hooks do NOT contain bare top-level static imports
 * of knowledgeBankService or storageService.
 *
 * Static imports in these hooks pull the entire KB service tree into the
 * initial bundle even though KnowledgeBankPanel is lazy-loaded in Layout.tsx,
 * defeating Rollup's code-splitting for the KB feature chunk.
 *
 * Each service call must use `await import(...)` inline so Rollup can defer
 * the KB service tree to a separate lazy chunk.
 *
 * See: mydocs/DEVTOOLS-146-ADOPTION-PLAN.md — Phase 1
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const HOOKS_DIR = resolve(__dirname, '../features/knowledgeBank/hooks');

const HOOKS = [
    'usePasteTextHandler.ts',
    'useDocumentGroupHandlers.ts',
    'useKnowledgeBankPanelHandlers.ts',
] as const;

describe('KB bundle isolation — no top-level static imports of service modules in hooks', () => {
    for (const hook of HOOKS) {
        it(`${hook} does not statically import knowledgeBankService`, () => {
            const content = readFileSync(resolve(HOOKS_DIR, hook), 'utf-8');
            expect(
                content,
                `${hook} must not have a top-level "import ... from '../services/knowledgeBankService'" — use await import() inline instead`,
            ).not.toMatch(/^import .+ from ['"]\.\.\/services\/knowledgeBankService['"]/m);
        });

        it(`${hook} does not statically import storageService`, () => {
            const content = readFileSync(resolve(HOOKS_DIR, hook), 'utf-8');
            expect(
                content,
                `${hook} must not have a top-level "import ... from '../services/storageService'" — use await import() inline instead`,
            ).not.toMatch(/^import .+ from ['"]\.\.\/services\/storageService['"]/m);
        });
    }
});
