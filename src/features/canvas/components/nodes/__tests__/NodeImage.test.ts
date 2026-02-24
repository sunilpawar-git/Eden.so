/**
 * NodeImage Styling Tests — Validates CSS uses only design tokens and is loaded
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ideaCardPath = path.resolve(__dirname, '../IdeaCard.tsx');
const ideaCardContent = fs.readFileSync(ideaCardPath, 'utf-8');

const cssPath = path.resolve(__dirname, '../NodeImage.module.css');
const cssContent = fs.readFileSync(cssPath, 'utf-8');

describe('NodeImage.module.css', () => {
    it('uses --node-image-radius token for border-radius', () => {
        expect(cssContent).toContain('--node-image-radius');
    });

    it('uses --color-primary-light for hover state', () => {
        expect(cssContent).toContain('--color-primary-light');
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

    it('sets max-width: 100% for responsive images', () => {
        expect(cssContent).toContain('max-width: 100%');
    });

    it('sets height: auto to preserve aspect ratio', () => {
        expect(cssContent).toContain('height: auto');
    });

    it('constrains max-height via --node-image-applied-max-height token', () => {
        expect(cssContent).toContain('--node-image-applied-max-height');
    });

    it('uses object-fit: contain to show full image without cropping', () => {
        expect(cssContent).toContain('object-fit: contain');
    });

    it('is imported by IdeaCard.tsx so styles are loaded at runtime', () => {
        expect(ideaCardContent).toMatch(/import\s.*NodeImage\.module\.css/);
    });
});
