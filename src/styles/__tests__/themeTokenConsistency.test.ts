/**
 * Theme Token Consistency Tests
 * Validates that CSS files use only defined theme tokens
 * TDD: These tests help prevent theme regression bugs
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// List of valid theme tokens from variables.css
const VALID_COLOR_TOKENS = [
    '--color-primary',
    '--color-primary-hover',
    '--color-primary-light',
    '--color-secondary',
    '--color-secondary-hover',
    '--color-success',
    '--color-success-bg',
    '--color-success-text',
    '--color-warning',
    '--color-warning-bg',
    '--color-warning-text',
    '--color-error',
    '--color-error-bg',
    '--color-error-text',
    '--color-info-bg',
    '--color-info-text',
    '--color-background',
    '--color-surface',
    '--color-surface-elevated',
    '--color-surface-hover',
    '--color-text-primary',
    '--color-text-secondary',
    '--color-text-muted',
    '--color-text',
    '--color-border',
    '--color-border-focus',
    '--color-hover',
];

const VALID_SHADOW_TOKENS = [
    '--shadow-sm',
    '--shadow-md',
    '--shadow-lg',
    '--shadow-xl',
    '--shadow-dropdown',
    '--card-shadow',
    '--card-shadow-hover',
    '--node-shadow',
];

/**
 * Get all CSS module files in the project
 */
function getCssModuleFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.includes('node_modules')) {
            files.push(...getCssModuleFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.module.css')) {
            files.push(fullPath);
        }
    }
    return files;
}

describe('Theme Token Consistency', () => {
    // Use process.cwd() which points to project root in vitest
    const srcDir = path.join(process.cwd(), 'src');
    const cssFiles = getCssModuleFiles(srcDir);

    it('should have CSS module files to test', () => {
        expect(cssFiles.length).toBeGreaterThan(0);
    });

    it('should not have hardcoded hex color fallbacks in CSS variables', () => {
        const violations: string[] = [];
        // Pattern matches var(--something, #hex) format
        const hexFallbackPattern = /var\([^,]+,\s*#[0-9a-fA-F]{3,6}\)/g;

        for (const file of cssFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            const matches = content.match(hexFallbackPattern);
            if (matches) {
                violations.push(`${path.basename(file)}: ${matches.join(', ')}`);
            }
        }

        expect(violations).toEqual([]);
    });

    it('should not have hardcoded rgba fallbacks in CSS variables', () => {
        const violations: string[] = [];
        // Pattern matches var(--something, rgba(...)) format
        const rgbaFallbackPattern = /var\([^,]+,\s*rgba?\([^)]+\)\)/g;

        for (const file of cssFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            const matches = content.match(rgbaFallbackPattern);
            if (matches) {
                violations.push(`${path.basename(file)}: ${matches.join(', ')}`);
            }
        }

        expect(violations).toEqual([]);
    });

    it('should have all required tokens defined in both light and dark themes', () => {
        const variablesPath = path.join(srcDir, 'styles/variables.css');
        const content = fs.readFileSync(variablesPath, 'utf-8');

        // Check each color token exists in :root (light theme)
        const criticalTokens = [
            '--color-background',
            '--color-surface',
            '--color-text-primary',
            '--color-primary',
            '--color-border',
            '--color-success-bg',
            '--color-success-text',
            '--color-error-bg',
            '--color-error-text',
            '--color-warning-bg',
            '--color-warning-text',
            '--color-info-bg',
            '--color-info-text',
        ];

        for (const token of criticalTokens) {
            const lightPattern = new RegExp(`:root[^}]*${token}:`, 's');
            expect(content).toMatch(lightPattern);
        }

        // Check dark theme (may be in separate file)
        const darkThemePath = path.join(srcDir, 'styles/themes/dark.css');
        const darkContent = fs.existsSync(darkThemePath)
            ? fs.readFileSync(darkThemePath, 'utf-8')
            : content;

        for (const token of criticalTokens) {
            const darkPattern = new RegExp(`\\[data-theme="dark"\\][^}]*${token}:`, 's');
            expect(darkContent).toMatch(darkPattern);
        }
    });

    it('should have critical tokens in all extended themes', () => {
        const criticalTokens = [
            '--color-background',
            '--color-surface',
            '--color-text-primary',
            '--color-primary',
            '--color-border',
            '--canvas-background',
            '--color-success-bg',
            '--color-success-text',
            '--color-error-bg',
            '--color-error-text',
            '--color-warning-bg',
            '--color-warning-text',
            '--color-info-bg',
            '--color-info-text',
        ];

        const themeFiles = [
            { name: 'sepia', selector: '[data-theme="sepia"]' },
            { name: 'grey', selector: '[data-theme="grey"]' },
            { name: 'darkBlack', selector: '[data-theme="darkBlack"]' },
        ];

        for (const theme of themeFiles) {
            const themePath = path.join(srcDir, `styles/themes/${theme.name}.css`);
            expect(fs.existsSync(themePath)).toBe(true);

            const content = fs.readFileSync(themePath, 'utf-8');
            for (const token of criticalTokens) {
                const pattern = new RegExp(
                    `\\[data-theme="${theme.name}"\\][^}]*${token}:`,
                    's'
                );
                expect(content).toMatch(pattern);
            }
        }
    });

    it('should have dark theme in separate file', () => {
        const darkPath = path.join(srcDir, 'styles/themes/dark.css');
        expect(fs.existsSync(darkPath)).toBe(true);
    });

    it('should export valid token lists for reference', () => {
        expect(VALID_COLOR_TOKENS.length).toBeGreaterThan(25);
        expect(VALID_SHADOW_TOKENS.length).toBeGreaterThan(5);
    });
});
