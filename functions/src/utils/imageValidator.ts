/**
 * Image Validator - Validates image URLs and response content types
 * Ensures only safe image MIME types are proxied
 */
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from './securityConstants.js';

/** Result of image validation */
export interface ImageValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Check if a Content-Type header value is a valid image MIME type.
 * Strips parameters (e.g. charset) before comparison.
 */
export function isAllowedImageType(contentType: string | null): boolean {
    if (!contentType) return false;
    const mimeType = contentType.split(';')[0]?.trim().toLowerCase();
    if (!mimeType) return false;
    return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Validate that the response content-length is within the size limit.
 * Returns true if size is acceptable (or unknown — will be checked during streaming).
 */
export function isWithinSizeLimit(
    contentLength: string | null,
    maxBytes: number = MAX_IMAGE_SIZE_BYTES,
): boolean {
    if (!contentLength) return true; // Will enforce during streaming
    const size = parseInt(contentLength, 10);
    return !isNaN(size) && size <= maxBytes;
}

/**
 * Validate an image response before proxying.
 * Checks content-type and content-length headers.
 */
export function validateImageResponse(
    contentType: string | null,
    contentLength: string | null,
): ImageValidationResult {
    if (!isAllowedImageType(contentType)) {
        return { valid: false, error: 'Response is not a valid image type' };
    }

    if (!isWithinSizeLimit(contentLength)) {
        return { valid: false, error: 'Image exceeds maximum size limit' };
    }

    return { valid: true };
}
