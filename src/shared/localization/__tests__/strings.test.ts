/**
 * String Resources Tests - TDD: Write tests FIRST
 * Tests for localized string resources
 */
import { describe, it, expect } from 'vitest';
import { strings } from '../strings';

describe('strings.resize', () => {
    it('should have resizeNode string', () => {
        expect(strings.resize.resizeNode).toBe('Resize node');
    });

    it('should have resizeHandle string', () => {
        expect(strings.resize.resizeHandle).toBe('Drag to resize');
    });

    it('should have corner string', () => {
        expect(strings.resize.corner).toBe('Corner resize handle');
    });

    it('should have edge string', () => {
        expect(strings.resize.edge).toBe('Edge resize handle');
    });
});

describe('strings structure', () => {
    it('should have all required sections', () => {
        expect(strings.app).toBeDefined();
        expect(strings.auth).toBeDefined();
        expect(strings.workspace).toBeDefined();
        expect(strings.canvas).toBeDefined();
        expect(strings.ideaCard).toBeDefined();
        expect(strings.resize).toBeDefined();
        expect(strings.errors).toBeDefined();
        expect(strings.common).toBeDefined();
    });
});
