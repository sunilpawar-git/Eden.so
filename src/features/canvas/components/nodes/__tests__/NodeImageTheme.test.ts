/**
 * NodeImage Theme Tests — Ensures design tokens exist for image styling
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const stylesDir = path.resolve(__dirname, '../../../../../styles/themes');

describe('variables.css defines image tokens', () => {
    it('defines --node-image-radius', () => {
        const css = fs.readFileSync(path.resolve(stylesDir, '../variables.css'), 'utf-8');
        expect(css).toContain('--node-image-radius');
    });
});
