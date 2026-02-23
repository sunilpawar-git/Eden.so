/**
 * NodeImage Theme Tests — Ensures dark themes override image overlay colors
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const stylesDir = path.resolve(__dirname, '../../../../../styles/themes');

describe('Dark theme image overlay overrides', () => {
    it('dark.css overrides --node-image-overlay-bg', () => {
        const css = fs.readFileSync(path.join(stylesDir, 'dark.css'), 'utf-8');
        expect(css).toContain('--node-image-overlay-bg');
    });

    it('darkBlack.css overrides --node-image-overlay-bg', () => {
        const css = fs.readFileSync(path.join(stylesDir, 'darkBlack.css'), 'utf-8');
        expect(css).toContain('--node-image-overlay-bg');
    });
});

describe('variables.css defines image tokens', () => {
    it('defines --node-image-radius', () => {
        const css = fs.readFileSync(path.resolve(stylesDir, '../variables.css'), 'utf-8');
        expect(css).toContain('--node-image-radius');
    });

    it('defines --node-image-overlay-bg', () => {
        const css = fs.readFileSync(path.resolve(stylesDir, '../variables.css'), 'utf-8');
        expect(css).toContain('--node-image-overlay-bg');
    });
});
