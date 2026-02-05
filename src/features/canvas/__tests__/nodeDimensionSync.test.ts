/**
 * Node Dimension Sync Tests
 * Validates that CSS variables in variables.css match TypeScript constants in node.ts
 * This test eliminates tech debt from manual sync requirements
 */
import { describe, it, expect } from 'vitest';
import {
    MIN_NODE_WIDTH,
    MAX_NODE_WIDTH,
    MIN_NODE_HEIGHT,
    MAX_NODE_HEIGHT,
} from '../types/node';
import fs from 'fs';
import path from 'path';

/**
 * Parse CSS variable value from CSS file content
 */
function parseCssVariable(cssContent: string, variableName: string): number | null {
    // Match pattern: --variable-name: 123px;
    const regex = new RegExp(`${variableName}:\\s*(\\d+)px`, 'g');
    const match = regex.exec(cssContent);
    const value = match?.[1];
    if (value === undefined) {
        return null;
    }
    return parseInt(value, 10);
}

/**
 * Extract CSS values from :root section only (not compact mode)
 */
function extractRootCssValues(cssContent: string): string {
    const regex = /:root\s*\{([^}]+)\}/;
    const rootMatch = regex.exec(cssContent);
    return rootMatch?.[1] ?? '';
}

describe('Node Dimension CSS/TS Sync Validation', () => {
    // Read the CSS file (relative to test location in src/features/canvas/__tests__)
    const cssPath = path.resolve(__dirname, '../../../styles/variables.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    const rootCssContent = extractRootCssValues(cssContent);

    describe('CSS variables match TypeScript constants', () => {
        it('--card-min-width matches MIN_NODE_WIDTH', () => {
            const cssValue = parseCssVariable(rootCssContent, '--card-min-width');
            expect(cssValue).toBe(MIN_NODE_WIDTH);
        });

        it('--card-max-width matches MAX_NODE_WIDTH', () => {
            const cssValue = parseCssVariable(rootCssContent, '--card-max-width');
            expect(cssValue).toBe(MAX_NODE_WIDTH);
        });

        it('--card-min-height matches MIN_NODE_HEIGHT', () => {
            const cssValue = parseCssVariable(rootCssContent, '--card-min-height');
            expect(cssValue).toBe(MIN_NODE_HEIGHT);
        });

        it('--card-max-height matches MAX_NODE_HEIGHT', () => {
            const cssValue = parseCssVariable(rootCssContent, '--card-max-height');
            expect(cssValue).toBe(MAX_NODE_HEIGHT);
        });
    });

    describe('CSS file structure', () => {
        it('should have node size constraints section in :root', () => {
            expect(rootCssContent).toContain('--card-min-width');
            expect(rootCssContent).toContain('--card-max-width');
            expect(rootCssContent).toContain('--card-min-height');
            expect(rootCssContent).toContain('--card-max-height');
        });

        it('should have compact mode overrides', () => {
            expect(cssContent).toContain('.compact-mode');
        });
    });
});
