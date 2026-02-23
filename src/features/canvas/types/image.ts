/**
 * Image Types — Constants and types for node image uploads
 * SSOT for image-related constraints across canvas feature
 */

/** Allowed image MIME types for node image uploads */
export const IMAGE_ACCEPTED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
] as const;

/** Max image file size in bytes (5 MB) */
export const IMAGE_MAX_FILE_SIZE = 5 * 1024 * 1024;
