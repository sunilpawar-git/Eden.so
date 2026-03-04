/**
 * Document Agent Prompts — builds the extraction prompt for Gemini.
 * AI-facing text (exempt from localization).
 */
import { AGENT_INPUT_MAX_CHARS, DOCUMENT_CLASSIFICATIONS } from '../types/documentAgent';
import type { DocumentClassification } from '../types/documentAgent';

const MAX_FILENAME_LENGTH = 200;

/** Sanitize filename to prevent prompt injection via path traversal */
export function sanitizeFilename(filename: string): string {
    return filename
        .replace(/\.\./g, '')
        .replace(/[/\\]/g, '')
        .slice(0, MAX_FILENAME_LENGTH);
}

/** AI-facing retry instruction when first response was not valid JSON */
export const JSON_RETRY_INSTRUCTION = 'Your response was not valid JSON. Please respond with ONLY the JSON object, no extra text.';

/** Classification-specific extraction instructions keyed by document type */
const CLASSIFICATION_FIELDS: Partial<Record<DocumentClassification, string>> = {
    invoice: 'Also extract: line items, total amount, due date, vendor name, payment status',
    bill: 'Also extract: total amount, due date, service provider, billing period',
    payslip: 'Also extract: gross pay, net pay, deductions breakdown, employer, pay period',
    medical_report: 'Also extract: diagnosis, medications, follow-up dates, physician name',
    legal_contract: 'Also extract: parties involved, key terms, obligations, expiry date',
    academic_paper: 'Also extract: thesis statement, methodology, key findings, citations count',
    meeting_notes: 'Also extract: decisions made, action owners, next steps, deadlines',
    resume: 'Also extract: skills list, experience timeline, education, certifications',
};

/**
 * Get classification-specific extraction fields for enhanced prompting.
 * Returns null for generic or unsupported classifications.
 */
export function getClassificationSpecificFields(classification: DocumentClassification): string | null {
    return CLASSIFICATION_FIELDS[classification] ?? null;
}

/** Build the main extraction prompt with optional classification-specific instructions */
export function buildExtractionPrompt(parsedText: string, filename: string): string {
    const safeName = sanitizeFilename(filename);
    const truncatedText = parsedText.slice(0, AGENT_INPUT_MAX_CHARS);
    const classifications = DOCUMENT_CLASSIFICATIONS.join(', ');

    return `You are a document analysis assistant. Analyze the following document and return a JSON object with these exact fields:

{
  "classification": one of [${classifications}],
  "confidence": one of ["high", "medium", "low"],
  "summary": a 2-3 sentence summary of the document,
  "keyFacts": array of up to 8 key facts or data points,
  "actionItems": array of action items or next steps (empty if none),
  "questions": array of up to 5 questions worth investigating,
  "extendedFacts": array of classification-specific details (see below, empty if generic)
}

If the document matches a specific type, populate extendedFacts with type-specific data:
- Invoice/Bill: line items, total, due date, vendor, payment status
- Payslip: gross/net pay, deductions, employer, pay period
- Medical Report: diagnosis, medications, follow-up dates
- Legal Contract: parties, key terms, obligations, expiry
- Academic Paper: thesis, methodology, findings, citations
- Meeting Notes: decisions, owners, next steps, deadlines
- Resume: skills, experience timeline, education

Document filename: ${safeName}

--- DOCUMENT CONTENT ---
${truncatedText}
--- END DOCUMENT ---

Respond with ONLY the JSON object. No explanation, no markdown fences, no extra text.`;
}
