/**
 * Shared sanitization utilities
 * SSOT for filename and input sanitization across all features
 */

/**
 * Sanitize a filename to prevent path traversal and special character exploits.
 * Strips directory separators, "..", and non-printable characters.
 */
export function sanitizeFilename(raw: string): string {
    const stripped = raw.replace(/[/\\]/g, '_').replace(/\.\./g, '_');
    // eslint-disable-next-line no-control-regex
    const cleaned = stripped.replace(/[\x00-\x1F\x7F]/g, '');
    return cleaned || 'unnamed';
}

/**
 * Sanitize markdown before passing to renderers (e.g. markmap-lib) that
 * convert markdown to HTML tree nodes rendered via innerHTML.
 * Strips dangerous tags, event handlers, and protocol URIs.
 */
export function sanitizeMarkdown(md: string): string {
    if (!md) return md;
    return md
        // Strip <script>, <iframe>, <object>, <embed>, <style> tags + content
        .replace(/<(script|iframe|object|embed|style)\b[^]*?<\/\1>/gi, '')
        // Strip self-closing / orphaned dangerous tags
        .replace(/<\/?(script|iframe|object|embed)\b[^>]*>/gi, '')
        // Strip inline event handlers (onerror=, onclick=, onload=, etc.)
        .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\bon\w+\s*=\s*\S+/gi, '')
        // Strip javascript: and data:text/html protocol URIs
        .replace(/javascript\s*:/gi, '')
        .replace(/data\s*:\s*text\/html/gi, '');
}
