/**
 * Structural safety tests — prevent regressions via static analysis.
 * Scans synthesis source files for anti-patterns.
 */
import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SYNTH_ROOT = join(__dirname, '..');
const MAX_LINES = 300;
const MAX_COMPONENT_LINES = 100;
const MAX_HOOK_LINES = 75;

function getAllFiles(dir: string, ext: string): string[] {
    const results: string[] = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            if (entry === '__tests__' || entry === 'node_modules') continue;
            results.push(...getAllFiles(full, ext));
        } else if (full.endsWith(ext)) {
            results.push(full);
        }
    }
    return results;
}

function readSource(file: string): string {
    return readFileSync(file, 'utf-8');
}

describe('Synthesis structural safety', () => {
    test('all synthesis files under 300 lines', () => {
        const files = [...getAllFiles(SYNTH_ROOT, '.ts'), ...getAllFiles(SYNTH_ROOT, '.tsx')];
        for (const file of files) {
            const lines = readSource(file).split('\n').length;
            expect(lines, `${file} has ${lines} lines (max ${MAX_LINES})`).toBeLessThanOrEqual(MAX_LINES);
        }
    });

    test('all component files under 100 lines', () => {
        const compDir = join(SYNTH_ROOT, 'components');
        const files = getAllFiles(compDir, '.tsx');
        for (const file of files) {
            const lines = readSource(file).split('\n').length;
            expect(lines, `${file} has ${lines} lines (max ${MAX_COMPONENT_LINES})`).toBeLessThanOrEqual(MAX_COMPONENT_LINES);
        }
    });

    test('hook files under 75 lines', () => {
        const hookDir = join(SYNTH_ROOT, 'hooks');
        const files = getAllFiles(hookDir, '.ts');
        for (const file of files) {
            const lines = readSource(file).split('\n').length;
            expect(lines, `${file} has ${lines} lines (max ${MAX_HOOK_LINES})`).toBeLessThanOrEqual(MAX_HOOK_LINES);
        }
    });

    test('no bare Zustand destructuring in synthesis feature', () => {
        const files = [...getAllFiles(SYNTH_ROOT, '.ts'), ...getAllFiles(SYNTH_ROOT, '.tsx')];
        const pattern = /use(Canvas|Workspace|Auth|Toast|Confirm|Settings|Focus|KnowledgeBank)Store\(\)/;
        for (const file of files) {
            const content = readSource(file);
            const match = pattern.exec(content);
            expect(match, `${file} has bare Zustand call: ${match?.[0]}`).toBeNull();
        }
    });

    test('no any types in synthesis feature', () => {
        const files = [...getAllFiles(SYNTH_ROOT, '.ts'), ...getAllFiles(SYNTH_ROOT, '.tsx')];
        for (const file of files) {
            const content = readSource(file);
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i] ?? '';
                if (line.includes(': any') || line.includes('<any>') || line.includes('as any')) {
                    expect.fail(`${file}:${i + 1} contains 'any' type: ${line.trim()}`);
                }
            }
        }
    });

    test('SelectionToolbar uses React.memo', () => {
        const content = readSource(join(SYNTH_ROOT, 'components', 'SelectionToolbar.tsx'));
        expect(content).toContain('React.memo');
    });

    test('SynthesisFooter uses React.memo', () => {
        const content = readSource(join(SYNTH_ROOT, 'components', 'SynthesisFooter.tsx'));
        expect(content).toContain('React.memo');
    });

    test('NODE_COLOR_KEYS includes synthesis', () => {
        const nodeTs = readFileSync(join(__dirname, '../../canvas/types/node.ts'), 'utf-8');
        expect(nodeTs).toContain("'synthesis'");
    });

    test('nodeColorStyles has [data-color="synthesis"] selector', () => {
        const css = readFileSync(
            join(__dirname, '../../canvas/components/nodes/nodeColorStyles.module.css'),
            'utf-8'
        );
        expect(css).toContain('[data-color="synthesis"]');
    });

    test('synthesisPrompts.ts uses only synthesisStrings — no hardcoded instruction strings', () => {
        const content = readSource(join(SYNTH_ROOT, 'services', 'synthesisPrompts.ts'));
        const lines = content.split('\n').filter(
            (l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('import')
        );
        for (const line of lines) {
            const match = /['"]([A-Z][a-z]{3,}[^'"]*)['"]/u.exec(line);
                if (match && !line.includes('synthesisStrings') && !line.includes('Content:') && !line.includes('Attachment:') && !line.includes('Children:')) {
                    expect.fail(`Hardcoded string found in synthesisPrompts.ts: ${match[0]}`);
            }
        }
    });
});
