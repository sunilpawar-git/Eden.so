/**
 * Image Compressor — Client-side image compression using Canvas API
 * Reduces image size before upload to Firebase Storage
 */
import { KB_MAX_IMAGE_DIMENSION, KB_IMAGE_QUALITY } from '../types/knowledgeBank';

/** Calculate new dimensions preserving aspect ratio */
export function calculateDimensions(
    width: number,
    height: number
): { width: number; height: number } {
    const maxDim = KB_MAX_IMAGE_DIMENSION;
    if (width <= maxDim && height <= maxDim) return { width, height };

    const ratio = Math.min(maxDim / width, maxDim / height);
    return {
        width: Math.round(width * ratio),
        height: Math.round(height * ratio),
    };
}

/** Compress an image file: resize to max dimension, convert to JPEG */
export async function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            const { width, height } = calculateDimensions(img.width, img.height);

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context unavailable'));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                (blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Compression failed'));
                },
                'image/jpeg',
                KB_IMAGE_QUALITY
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}
