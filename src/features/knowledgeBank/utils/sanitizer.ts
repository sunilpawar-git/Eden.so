/**
 * Content Sanitizer — XSS prevention for Knowledge Bank entries
 * Uses DOMParser to safely extract text content, stripping all HTML
 */

/** Strip all HTML to prevent XSS. Uses DOMParser for robust tag removal. */
export function sanitizeContent(input: string): string {
    // DOMParser safely parses HTML without executing scripts or loading resources
    const doc = new DOMParser().parseFromString(input, 'text/html');
    const text = doc.body.textContent ?? '';
    // Also strip javascript: protocol URIs that could survive as plain text
    return text.replace(/javascript:/gi, '');
}
