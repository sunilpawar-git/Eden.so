/**
 * Document Agent Types — Zod schemas, type definitions, and constants
 * for the document intelligence extraction pipeline.
 */
import { z } from 'zod';

export const DOCUMENT_CLASSIFICATIONS = [
    'invoice', 'payslip', 'receipt', 'legal_contract', 'academic_paper',
    'meeting_notes', 'personal_letter', 'report', 'bill',
    'medical_report', 'resume', 'generic',
] as const;

export type DocumentClassification = (typeof DOCUMENT_CLASSIFICATIONS)[number];

export const CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

/** Zod schema for validating Gemini's JSON response */
export const ExtractionResultSchema = z.object({
    classification: z.enum(DOCUMENT_CLASSIFICATIONS).catch('generic'),
    confidence: z.enum(CONFIDENCE_LEVELS).catch('low'),
    summary: z.string().catch(''),
    keyFacts: z.array(z.string()).catch([]),
    actionItems: z.array(z.string()).catch([]),
    questions: z.array(z.string()).catch([]),
    extendedFacts: z.array(z.string()).catch([]),
});

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

/** Agent state machine states */
export type AnalysisStatus = 'idle' | 'analyzing' | 'complete' | 'failed';

/** Actions for the agent useReducer */
export type AgentAction =
    | { type: 'START_ANALYSIS' }
    | { type: 'ANALYSIS_COMPLETE'; payload: ExtractionResult; insightNodeId: string }
    | { type: 'ANALYSIS_FAILED'; error: string }
    | { type: 'RESET' };

/** State for the agent useReducer */
export interface AgentState {
    status: AnalysisStatus;
    result: ExtractionResult | null;
    insightNodeId: string | null;
    error: string | null;
}

export const INITIAL_AGENT_STATE: AgentState = {
    status: 'idle',
    result: null,
    insightNodeId: null,
    error: null,
};

/** Input text truncation limit (chars) — ~12K tokens ≈ first ~20 pages */
export const AGENT_INPUT_MAX_CHARS = 48_000;

/** Max output tokens for agent Gemini call */
export const AGENT_MAX_OUTPUT_TOKENS = 1500;

/** Low temperature for deterministic extraction */
export const AGENT_TEMPERATURE = 0.2;
