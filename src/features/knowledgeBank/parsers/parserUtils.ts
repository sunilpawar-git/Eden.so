/**
 * Shared parser utilities
 * SSOT for common parser helper functions
 */

/** Extract a display title from a filename by stripping the extension */
export function titleFromFilename(filename: string): string {
    return filename.replace(/\.[^/.]+$/, '');
}
