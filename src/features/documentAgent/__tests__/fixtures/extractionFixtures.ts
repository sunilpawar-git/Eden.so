/**
 * Shared ExtractionResult fixtures — SSOT for test data.
 * Use createMockExtraction() with overrides to avoid duplicating across test files.
 */
import type { ExtractionResult } from '../../types/documentAgent';

export function createMockExtraction(
    overrides?: Partial<ExtractionResult>,
): ExtractionResult {
    return {
        classification: 'invoice',
        confidence: 'high',
        summary: 'Monthly bill',
        keyFacts: ['Amount: $100'],
        actionItems: ['Pay now'],
        questions: ['Auto-pay?'],
        extendedFacts: [],
        ...overrides,
    };
}
