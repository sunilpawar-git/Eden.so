/**
 * Document Agent Types Tests — Zod schema validation and constants
 */
import { describe, it, expect } from 'vitest';
import {
    ExtractionResultSchema,
    DOCUMENT_CLASSIFICATIONS,
    CONFIDENCE_LEVELS,
    AGENT_INPUT_MAX_CHARS,
    AGENT_MAX_OUTPUT_TOKENS,
    AGENT_TEMPERATURE,
    INITIAL_AGENT_STATE,
    type ExtractionResult,
    type AgentState,
} from '../types/documentAgent';

describe('ExtractionResultSchema', () => {
    const validInput = {
        classification: 'invoice',
        confidence: 'high',
        summary: 'Monthly electricity bill for January 2025.',
        keyFacts: ['Amount: $142.50', 'Due: Feb 15'],
        actionItems: ['Pay before due date'],
        questions: ['Is auto-pay enabled?'],
    };

    it('parses valid JSON correctly', () => {
        const result = ExtractionResultSchema.parse(validInput);

        expect(result.classification).toBe('invoice');
        expect(result.confidence).toBe('high');
        expect(result.summary).toBe('Monthly electricity bill for January 2025.');
        expect(result.keyFacts).toEqual(['Amount: $142.50', 'Due: Feb 15']);
        expect(result.actionItems).toEqual(['Pay before due date']);
        expect(result.questions).toEqual(['Is auto-pay enabled?']);
    });

    it('fills default "generic" for missing classification', () => {
        const { classification: _ignored, ...rest } = validInput;
        const result = ExtractionResultSchema.parse(rest);

        expect(result.classification).toBe('generic');
    });

    it('fills default "low" for missing confidence', () => {
        const { confidence: _ignored, ...rest } = validInput;
        const result = ExtractionResultSchema.parse(rest);

        expect(result.confidence).toBe('low');
    });

    it('fills empty arrays for missing keyFacts/actionItems/questions', () => {
        const result = ExtractionResultSchema.parse({
            classification: 'report',
            confidence: 'medium',
            summary: 'A short report.',
        });

        expect(result.keyFacts).toEqual([]);
        expect(result.actionItems).toEqual([]);
        expect(result.questions).toEqual([]);
    });

    it('fills empty string for missing summary', () => {
        const result = ExtractionResultSchema.parse({
            classification: 'report',
            confidence: 'medium',
        });

        expect(result.summary).toBe('');
    });

    it('rejects completely invalid input with all defaults', () => {
        const result = ExtractionResultSchema.parse({});

        expect(result.classification).toBe('generic');
        expect(result.confidence).toBe('low');
        expect(result.summary).toBe('');
        expect(result.keyFacts).toEqual([]);
        expect(result.actionItems).toEqual([]);
        expect(result.questions).toEqual([]);
    });

    it('catches invalid classification enum with "generic"', () => {
        const result = ExtractionResultSchema.parse({
            ...validInput,
            classification: 'not_a_real_type',
        });

        expect(result.classification).toBe('generic');
    });

    it('catches invalid confidence enum with "low"', () => {
        const result = ExtractionResultSchema.parse({
            ...validInput,
            confidence: 'super_high',
        });

        expect(result.confidence).toBe('low');
    });

    it('catches non-array keyFacts with empty array', () => {
        const result = ExtractionResultSchema.parse({
            ...validInput,
            keyFacts: 'not an array',
        });

        expect(result.keyFacts).toEqual([]);
    });

    it('fills empty array for missing extendedFacts', () => {
        const result = ExtractionResultSchema.parse(validInput);

        expect(result.extendedFacts).toEqual([]);
    });

    it('parses extendedFacts when present', () => {
        const result = ExtractionResultSchema.parse({
            ...validInput,
            extendedFacts: ['Total: $500', 'Due: March 1'],
        });

        expect(result.extendedFacts).toEqual(['Total: $500', 'Due: March 1']);
    });

    it('catches non-array extendedFacts with empty array', () => {
        const result = ExtractionResultSchema.parse({
            ...validInput,
            extendedFacts: 'not an array',
        });

        expect(result.extendedFacts).toEqual([]);
    });

    it('accepts all valid classification values', () => {
        for (const classification of DOCUMENT_CLASSIFICATIONS) {
            const result = ExtractionResultSchema.parse({ ...validInput, classification });
            expect(result.classification).toBe(classification);
        }
    });

    it('accepts all valid confidence levels', () => {
        for (const confidence of CONFIDENCE_LEVELS) {
            const result = ExtractionResultSchema.parse({ ...validInput, confidence });
            expect(result.confidence).toBe(confidence);
        }
    });
});

describe('Constants', () => {
    it('AGENT_INPUT_MAX_CHARS is 48000', () => {
        expect(AGENT_INPUT_MAX_CHARS).toBe(48_000);
    });

    it('AGENT_MAX_OUTPUT_TOKENS is 1500', () => {
        expect(AGENT_MAX_OUTPUT_TOKENS).toBe(1500);
    });

    it('AGENT_TEMPERATURE is 0.2', () => {
        expect(AGENT_TEMPERATURE).toBe(0.2);
    });

    it('DOCUMENT_CLASSIFICATIONS includes expected types', () => {
        expect(DOCUMENT_CLASSIFICATIONS).toContain('invoice');
        expect(DOCUMENT_CLASSIFICATIONS).toContain('generic');
        expect(DOCUMENT_CLASSIFICATIONS).toContain('academic_paper');
        expect(DOCUMENT_CLASSIFICATIONS.length).toBeGreaterThanOrEqual(12);
    });

    it('CONFIDENCE_LEVELS has exactly high/medium/low', () => {
        expect(CONFIDENCE_LEVELS).toEqual(['high', 'medium', 'low']);
    });
});

describe('INITIAL_AGENT_STATE', () => {
    it('has correct default shape', () => {
        const expected: AgentState = {
            status: 'idle',
            result: null,
            insightNodeId: null,
            error: null,
        };

        expect(INITIAL_AGENT_STATE).toEqual(expected);
    });
});

describe('Type exports', () => {
    it('ExtractionResult type matches schema output', () => {
        const parsed = ExtractionResultSchema.parse({
            classification: 'invoice',
            confidence: 'high',
            summary: 'test',
            keyFacts: ['a'],
            actionItems: ['b'],
            questions: ['c'],
        });
        const typed: ExtractionResult = parsed;
        expect(typed.classification).toBe('invoice');
    });
});
