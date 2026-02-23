/**
 * NodeImage Styling Tests — Validates CSS uses only design tokens
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const cssPath = path.resolve(__dirname, '../NodeImage.module.css');
const cssContent = fs.readFileSync(cssPath, 'utf-8');

describe('NodeImage.module.css', () => {
    it('uses --node-image-radius token for border-radius', () => {
        expect(cssContent).toContain('--node-image-radius');
    });

    it('uses --color-primary-light for hover state', () => {
        expect(cssContent).toContain('--color-primary-light');
    });

    it('uses --color-primary for spinner accent', () => {
        expect(cssContent).toContain('--color-primary');
    });

    it('uses --color-border for spinner base', () => {
        expect(cssContent).toContain('--color-border');
    });

    it('uses --node-image-overlay-bg for upload overlay', () => {
        expect(cssContent).toContain('--node-image-overlay-bg');
    });

    it('does not contain hardcoded color values', () => {
        const lines = cssContent.split('\n');
        const codeLines = lines.filter(l =>
            !l.trim().startsWith('/*') &&
            !l.trim().startsWith('*') &&
            !l.trim().startsWith('/**') &&
            l.trim().length > 0
        );
        const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b/;
        const violatingLines = codeLines.filter(l =>
            hardcodedColorPattern.test(l)
        );
        expect(violatingLines).toEqual([]);
    });

    it('uses --space-xs for image margin', () => {
        expect(cssContent).toContain('--space-xs');
    });

    it('uses --radius-full for spinner shape', () => {
        expect(cssContent).toContain('--radius-full');
    });

    it('sets max-width: 100% for responsive images', () => {
        expect(cssContent).toContain('max-width: 100%');
    });
});
