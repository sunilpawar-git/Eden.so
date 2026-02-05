/**
 * Slash Commands Service Tests
 * TDD: Tests written first, implementation follows
 */
import { describe, it, expect } from 'vitest';
import {
    slashCommands,
    filterCommands,
    getCommandById,
} from '../slashCommands';

describe('slashCommands', () => {
    describe('slashCommands array', () => {
        it('contains at least one command', () => {
            expect(slashCommands.length).toBeGreaterThan(0);
        });

        it('has ai-generate command', () => {
            const targetId = 'ai-generate';
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Test validates command exists
            const aiCommand = slashCommands.find(cmd => cmd.id === targetId);
            expect(aiCommand).toBeDefined();
            expect(aiCommand?.id).toBe(targetId);
        });

        it('all commands have required fields', () => {
            slashCommands.forEach(cmd => {
                expect(cmd.id).toBeDefined();
                expect(cmd.labelKey).toBeDefined();
                expect(cmd.descriptionKey).toBeDefined();
                expect(cmd.icon).toBeDefined();
                expect(cmd.keywords).toBeDefined();
                expect(Array.isArray(cmd.keywords)).toBe(true);
                expect(cmd.keywords.length).toBeGreaterThan(0);
            });
        });
    });

    describe('filterCommands', () => {
        it('returns all commands for empty query', () => {
            const result = filterCommands('');
            expect(result).toEqual(slashCommands);
        });

        it('filters by keyword prefix "ai"', () => {
            const targetId = 'ai-generate';
            const result = filterCommands('ai');
            expect(result.length).toBeGreaterThan(0);
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Test validates filtering works
            expect(result.some(cmd => cmd.id === targetId)).toBe(true);
        });

        it('filters by keyword prefix "gen"', () => {
            const targetId = 'ai-generate';
            const result = filterCommands('gen');
            expect(result.length).toBeGreaterThan(0);
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Test validates filtering works
            expect(result.some(cmd => cmd.id === targetId)).toBe(true);
        });

        it('returns empty array for no match', () => {
            const result = filterCommands('xyz123nonexistent');
            expect(result).toEqual([]);
        });

        it('is case insensitive', () => {
            const lowerResult = filterCommands('ai');
            const upperResult = filterCommands('AI');
            const mixedResult = filterCommands('Ai');
            
            expect(lowerResult).toEqual(upperResult);
            expect(upperResult).toEqual(mixedResult);
        });

        it('matches keyword start, not substring', () => {
            // "ai" should match because "ai" keyword starts with "ai"
            const aiResult = filterCommands('ai');
            expect(aiResult.length).toBeGreaterThan(0);
            
            // "i" should not match "ai" (not at start)
            // But might match other keywords starting with "i" if any
            // For now, we only have ai-generate, so "i" should not match
            const iResult = filterCommands('i');
            expect(iResult.length).toBe(0);
        });
    });

    describe('getCommandById', () => {
        it('returns command for valid id "ai-generate"', () => {
            const targetId = 'ai-generate';
            const result = getCommandById(targetId);
            expect(result).toBeDefined();
            expect(result?.id).toBe(targetId);
        });

        it('returns undefined for invalid id', () => {
            const result = getCommandById('nonexistent-command');
            expect(result).toBeUndefined();
        });

        it('returns undefined for empty id', () => {
            const result = getCommandById('');
            expect(result).toBeUndefined();
        });
    });
});
