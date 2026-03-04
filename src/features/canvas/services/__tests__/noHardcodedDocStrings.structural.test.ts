/**
 * Structural test: No hardcoded user-facing strings in document feature files
 *
 * Scans document-related production files for throw new Error('literal')
 * patterns where the string is NOT sourced from the localization layer.
 * Prevents tech debt from hardcoded error messages.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const ROOT = resolve(__dirname, '../../../../..');

function readSource(relativePath: string): string {
    return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

const DOCUMENT_PRODUCTION_FILES = [
    'src/features/canvas/hooks/useNodeDocumentUpload.ts',
    'src/features/canvas/hooks/useDocumentInsert.ts',
    'src/features/canvas/services/documentInsertService.ts',
    'src/features/canvas/services/documentUploadService.ts',
    'src/features/canvas/services/documentParsingService.ts',
    'src/features/canvas/types/document.ts',
];

/**
 * Matches `throw new Error('...')` or `reject(new Error('...'))`
 * where the argument is a raw string literal (not strings.xxx).
 */
const HARDCODED_ERROR_REGEX = /(?:throw|reject\()\s*new\s+Error\(\s*'[^']+'\s*\)/g;

describe('No hardcoded strings in document feature files', () => {
    it.each(DOCUMENT_PRODUCTION_FILES)(
        '%s must not contain hardcoded error strings',
        (filePath) => {
            const content = readSource(filePath);
            const matches = content.match(HARDCODED_ERROR_REGEX) ?? [];
            expect(
                matches,
                `Hardcoded error strings found in ${filePath}:\n${matches.map((m) => `  - ${m}`).join('\n')}\nUse strings.canvas.* from localization instead.`
            ).toEqual([]);
        }
    );
});
