/**
 * Structural test: linkUtils centralized protocol validation
 *
 * Ensures SAFE_LINK_PROTOCOLS constant is imported (not duplicated) across the codebase.
 * Prevents regression where regex patterns diverge between files.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import { SAFE_LINK_PROTOCOLS, SAFE_LINK_URL_START } from '../services/linkUtils';

const BUBBLE_MENU_SRC = readFileSync(
    join(process.cwd(), 'src/features/canvas/components/nodes/EditorBubbleMenu.tsx'),
    'utf-8',
);

const MARKDOWN_CONVERTER_SRC = readFileSync(
    join(process.cwd(), 'src/features/canvas/services/markdownConverter.ts'),
    'utf-8',
);

describe('linkUtils centralization', () => {
    it('exports SAFE_LINK_PROTOCOLS for markdown serialization', () => {
        expect(SAFE_LINK_PROTOCOLS).toBeInstanceOf(RegExp);
        expect(SAFE_LINK_PROTOCOLS.test('https://example.com')).toBe(true);
        expect(SAFE_LINK_PROTOCOLS.test('mailto:user@example.com')).toBe(true);
    });

    it('exports SAFE_LINK_URL_START for user input validation', () => {
        expect(SAFE_LINK_URL_START).toBeInstanceOf(RegExp);
        expect(SAFE_LINK_URL_START.test('https://example.com')).toBe(true);
        expect(SAFE_LINK_URL_START.test('http://example.com')).toBe(true);
    });

    it('rejects javascript: protocol in SAFE_LINK_PROTOCOLS', () => {
        expect(SAFE_LINK_PROTOCOLS.test('javascript:alert(1)')).toBe(false);
    });

    it('rejects data: protocol in SAFE_LINK_PROTOCOLS', () => {
        expect(SAFE_LINK_PROTOCOLS.test('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('rejects javascript: in SAFE_LINK_URL_START', () => {
        expect(SAFE_LINK_URL_START.test('javascript:alert(1)')).toBe(false);
    });

    it('rejects mailto: in SAFE_LINK_URL_START (user input must be http/https)', () => {
        expect(SAFE_LINK_URL_START.test('mailto:user@example.com')).toBe(false);
    });
});

describe('linkUtils wiring', () => {
    it('EditorBubbleMenu imports SAFE_LINK_URL_START from linkUtils', () => {
        expect(BUBBLE_MENU_SRC).toContain("import { SAFE_LINK_URL_START } from '../../services/linkUtils'");
    });

    it('EditorBubbleMenu does NOT define local SAFE_LINK_RE', () => {
        expect(BUBBLE_MENU_SRC).not.toContain('const SAFE_LINK_RE');
    });

    it('markdownConverter imports SAFE_LINK_PROTOCOLS from linkUtils', () => {
        expect(MARKDOWN_CONVERTER_SRC).toContain("import { SAFE_LINK_PROTOCOLS } from './linkUtils'");
    });

    it('markdownConverter does NOT define local SAFE_LINK_PROTOCOLS', () => {
        const lines = MARKDOWN_CONVERTER_SRC.split('\n');
        const localDefLine = lines.findIndex((l) => l.includes('const SAFE_LINK_PROTOCOLS'));
        expect(localDefLine).toBe(-1);
    });
});
