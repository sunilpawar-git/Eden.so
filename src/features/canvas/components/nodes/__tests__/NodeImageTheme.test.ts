/**
 * NodeImage Theme Tests — Ensures design tokens exist for image styling
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const stylesDir = path.resolve(__dirname, '../../../../../styles/themes');

describe('variables.css defines image tokens', () => {
    const css = fs.readFileSync(path.resolve(stylesDir, '../variables.css'), 'utf-8');

    it('defines --node-image-radius', () => {
        expect(css).toContain('--node-image-radius');
    });

    it('defines --node-image-max-height', () => {
        expect(css).toContain('--node-image-max-height');
    });

    it('overrides --node-image-max-height in compact mode', () => {
        const compactSection = css.slice(css.indexOf('.compact-mode'));
        expect(compactSection).toContain('--node-image-max-height');
    });
});
