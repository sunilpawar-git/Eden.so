/**
 * Zustand selector enforcement patterns — shared by structural tests.
 * Extracted to keep each test file under the 300-line limit.
 */
import { readdirSync } from 'fs';
import { join, relative } from 'path';

export const SRC_DIR = join(process.cwd(), 'src');

export interface ScanPattern { name: string; pattern: RegExp }

export const BARE_DESTRUCTURING_PATTERNS: ScanPattern[] = [
    { name: 'Destructuring from useAuthStore()', pattern: /const\s*\{[^}]+\}\s*=\s*useAuthStore\(\)/ },
    { name: 'Destructuring from useWorkspaceStore()', pattern: /const\s*\{[^}]+\}\s*=\s*useWorkspaceStore\(\)/ },
    { name: 'Destructuring from useCanvasStore()', pattern: /const\s*\{[^}]+\}\s*=\s*useCanvasStore\(\)/ },
    { name: 'Destructuring from useToastStore()', pattern: /const\s*\{[^}]+\}\s*=\s*useToastStore\(\)/ },
    { name: 'Destructuring from useConfirmStore()', pattern: /const\s*\{[^}]+\}\s*=\s*useConfirmStore\(\)/ },
    { name: 'Destructuring from useSettingsStore()', pattern: /const\s*\{[^}]+\}\s*=\s*useSettingsStore\(\)/ },
    { name: 'Destructuring from useFocusStore()', pattern: /const\s*\{[^}]+\}\s*=\s*useFocusStore\(\)/ },
    { name: 'Destructuring from useKnowledgeBankStore()', pattern: /const\s*\{[^}]+\}\s*=\s*useKnowledgeBankStore\(\)/ },
    { name: 'Destructuring from useSubscriptionStore()', pattern: /const\s*\{[^}]+\}\s*=\s*useSubscriptionStore\(\)/ },
];

export const CLOSURE_VARIABLE_PATTERNS: ScanPattern[] = [
    {
        name: 'getNodeMap inside useCanvasStore selector',
        pattern: /useCanvasStore\(\s*(?:useShallow\s*\()?\s*\(\s*\w+\s*\)\s*=>\s*[^)]*getNodeMap\s*\(/,
    },
    {
        name: 'method call (s.fn(arg)) inside any store selector',
        pattern: /use\w+Store\(\s*\(\s*\w+\s*\)\s*=>\s*\w+\.(?:hasAccess|isPinned|isSelected|getById)\s*\(/,
    },
    {
        name: 'object or array literal returned from store selector (new reference each render)',
        pattern: /use\w+Store\(\s*(?:useShallow\s*\()?\s*\(\s*\w+\s*\)\s*=>\s*(?:\{[^}]*\}|\[[^\]]*\])/,
    },
];

export const ACTION_SELECTOR_PATTERNS: ScanPattern[] = [
    {
        name: 'action selected via store selector',
        pattern: /use(?:Settings|Auth|Canvas|Workspace|Toast|Confirm|Focus|KnowledgeBank|Subscription)Store\(\s*\(\s*\w+\s*\)\s*=>\s*\w+\.(?:set\w+|toggle\w+|reset\w+|remove\w+|add\w+|clear\w+|load\w+|update\w+|start\w+|stop\w+|confirm|delete\w+|save\w+|create\w+)\b/,
    },
];

const SKIP_DIRS = ['node_modules', 'dist', '.git'];

export const ALLOWLIST: string[] = [
    'features/auth/stores/authStore.ts',
    'features/workspace/stores/workspaceStore.ts',
    'features/canvas/stores/canvasStore.ts',
    'shared/stores/toastStore.ts',
    'shared/stores/confirmStore.ts',
    'shared/stores/settingsStore.ts',
    'shared/stores/focusStore.ts',
    'features/knowledgeBank/stores/knowledgeBankStore.ts',
    'features/subscription/stores/subscriptionStore.ts',
];

export function getSourceFiles(dir: string, results: string[] = []): string[] {
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

export function rel(filePath: string): string {
    return relative(SRC_DIR, filePath);
}

export function isTestFile(relPath: string): boolean {
    return relPath.includes('__tests__') || relPath.endsWith('.test.ts') || relPath.endsWith('.test.tsx');
}
