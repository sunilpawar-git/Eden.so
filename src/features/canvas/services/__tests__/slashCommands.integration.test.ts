/**
 * Slash Commands Integration Tests
 * Validates only the AI generate command is registered
 */
import { describe, it, expect } from 'vitest';
import { slashCommands, filterCommands, getCommandById } from '@/features/canvas/services/slashCommands';

describe('Slash Commands Integration', () => {
    it('should have exactly 1 command (ai-generate)', () => {
        expect(slashCommands).toHaveLength(1);
        expect(slashCommands[0]?.id).toBe('ai-generate');
    });

    it('should find ai-generate by id', () => {
        const cmd = getCommandById('ai-generate');
        expect(cmd).toBeDefined();
        expect(cmd?.icon).toBe('✨');
    });

    it('should filter by "ai" to find ai-generate', () => {
        const results = filterCommands('ai');
        expect(results).toHaveLength(1);
        expect(results[0]?.id).toBe('ai-generate');
    });

    it('should return all commands when no filter', () => {
        const results = filterCommands('');
        expect(results).toHaveLength(1);
    });

    it('should return empty for unmatched query', () => {
        const results = filterCommands('xyz');
        expect(results).toHaveLength(0);
    });
});
