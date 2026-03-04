/**
 * Structural test: Storage rules content-type coverage
 *
 * Verifies that the content-type regex in storage.rules covers every MIME type
 * uploaded by documentUploadService. Prevents regressions where a new artifact
 * type is added in code but the storage rule silently rejects the upload.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const ROOT = resolve(__dirname, '../../../../..');

function readSource(relativePath: string): string {
    return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

/**
 * Extract the content-type regex string from the attachments rule in storage.rules.
 * Pattern: contentType.matches('...')
 */
function extractAttachmentContentTypeRegex(rulesSource: string): string | null {
    const regex = /attachments\/\{fileName\}[\s\S]*?contentType\.matches\('([^']+)'\)/;
    const match = regex.exec(rulesSource);
    return match?.[1] ?? null;
}

/**
 * All MIME types that documentUploadService uploads to the attachments path.
 * Raw documents use the file's original MIME, thumbnails use image/png,
 * parsed text uses text/plain.
 */
const UPLOADED_MIME_TYPES = [
    'application/pdf',
    'text/plain',
    'text/csv',
    'image/png', // thumbnail sidecar
];

describe('storage.rules attachment content-type coverage', () => {
    const rulesSource = readSource('storage.rules');
    const regexStr = extractAttachmentContentTypeRegex(rulesSource);

    it('should have a content-type regex in the attachments rule', () => {
        expect(regexStr).not.toBeNull();
    });

    it.each(UPLOADED_MIME_TYPES)(
        'content-type regex must match uploaded MIME type "%s"',
        (mimeType) => {
            expect(regexStr).not.toBeNull();
            const regex = new RegExp(`^(?:${regexStr!})$`);
            expect(
                regex.test(mimeType),
                `storage.rules content-type regex "${regexStr}" does not match "${mimeType}". ` +
                `Add "${mimeType}" to the regex in storage.rules.`
            ).toBe(true);
        }
    );
});
