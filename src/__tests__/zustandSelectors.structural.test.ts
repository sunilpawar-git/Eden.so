/**
 * Structural test: Zustand store selector enforcement
 *
 * Prevents "Maximum update depth exceeded" errors by ensuring
 * all Zustand store hooks use selectors instead of subscribing
 * to the entire store.
 *
 * Anti-pattern (causes cascading re-renders):
 *   const { user } = useAuthStore();
 *
 * Correct pattern (only re-renders when `user` changes):
 *   const user = useAuthStore((s) => s.user);
 *
 * Actions should be accessed via .getState() inside callbacks:
 *   useWorkspaceStore.getState().removeWorkspace(id);
 */
import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';
import { describe, it, expect } from 'vitest';

const SRC_DIR = join(process.cwd(), 'src');

/** Patterns that indicate bare store subscriptions (anti-pattern) */
const ANTI_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
    {
        name: 'Destructuring from useAuthStore()',
        pattern: /const\s*\{[^}]+\}\s*=\s*useAuthStore\(\)/,
    },
    {
        name: 'Destructuring from useWorkspaceStore()',
        pattern: /const\s*\{[^}]+\}\s*=\s*useWorkspaceStore\(\)/,
    },
    {
        name: 'Destructuring from useCanvasStore()',
        pattern: /const\s*\{[^}]+\}\s*=\s*useCanvasStore\(\)/,
    },
    {
        name: 'Destructuring from useToastStore()',
        pattern: /const\s*\{[^}]+\}\s*=\s*useToastStore\(\)/,
    },
    {
        name: 'Destructuring from useConfirmStore()',
        pattern: /const\s*\{[^}]+\}\s*=\s*useConfirmStore\(\)/,
    },
    {
        name: 'Destructuring from useSettingsStore()',
        pattern: /const\s*\{[^}]+\}\s*=\s*useSettingsStore\(\)/,
    },
    {
        name: 'Destructuring from useFocusStore()',
        pattern: /const\s*\{[^}]+\}\s*=\s*useFocusStore\(\)/,
    },
    {
        name: 'Destructuring from useKnowledgeBankStore()',
        pattern: /const\s*\{[^}]+\}\s*=\s*useKnowledgeBankStore\(\)/,
    },
];

/** Directories and file patterns to skip */
const SKIP_DIRS = ['node_modules', 'dist', '.git'];

/** Files allowed to use bare store calls (e.g., store definition files) */
const ALLOWLIST: string[] = [
    // Store definition files create the store, not subscribe to it
    'features/auth/stores/authStore.ts',
    'features/workspace/stores/workspaceStore.ts',
    'features/canvas/stores/canvasStore.ts',
    'shared/stores/toastStore.ts',
    'shared/stores/confirmStore.ts',
    'shared/stores/settingsStore.ts',
    'shared/stores/focusStore.ts',
    'features/knowledgeBank/stores/knowledgeBankStore.ts',
];

function getSourceFiles(dir: string, results: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (SKIP_DIRS.includes(entry.name)) continue;
            getSourceFiles(full, results);
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
            results.push(full);
        }
    }
    return results;
}

function rel(filePath: string): string {
    return relative(SRC_DIR, filePath);
}

describe('Zustand selector enforcement', () => {
    const files = getSourceFiles(SRC_DIR);

    it('should scan a meaningful number of source files', () => {
        expect(files.length).toBeGreaterThan(50);
    });

    it.each(ANTI_PATTERNS)(
        'no file uses $name',
        ({ pattern }) => {
            const violations: string[] = [];

            for (const file of files) {
                const relPath = rel(file);
                if (ALLOWLIST.includes(relPath)) continue;
                // Skip test files - they may mock stores differently
                if (relPath.includes('__tests__')) continue;
                if (relPath.endsWith('.test.ts') || relPath.endsWith('.test.tsx')) continue;

                const content = readFileSync(file, 'utf-8');
                if (pattern.test(content)) {
                    violations.push(relPath);
                }
            }

            expect(
                violations,
                `Files with bare store subscriptions (use selectors instead):\n` +
                `  Pattern: ${pattern.toString()}\n` +
                `  Fix: const value = useStore((s) => s.value)\n\n` +
                `  Violations:\n${violations.map((v) => `    - ${v}`).join('\n')}`
            ).toEqual([]);
        }
    );

    it('provides documentation on correct patterns', () => {
        const correctPatterns = [
            '// ✅ CORRECT: Selector pattern - only re-renders when value changes',
            'const user = useAuthStore((s) => s.user);',
            'const nodes = useCanvasStore((s) => s.nodes);',
            '',
            '// ✅ CORRECT: Actions via getState() - stable reference, no subscription',
            'useWorkspaceStore.getState().removeWorkspace(id);',
            'useCanvasStore.getState().clearCanvas();',
            '',
            '// ❌ ANTI-PATTERN: Subscribes to ENTIRE store, causes cascading re-renders',
            '// const { user } = useAuthStore();',
            '// const { nodes, edges } = useCanvasStore();',
        ];
        // This test always passes but serves as documentation
        expect(correctPatterns.length).toBeGreaterThan(0);
    });
});
