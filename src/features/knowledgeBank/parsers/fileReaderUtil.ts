/**
 * File Reader Utility — Cross-environment file reading
 * Uses FileReader API which works in both browser and jsdom test environments
 */

/** Read a File/Blob as text using FileReader (works in jsdom + browser) */
export function readFileAsText(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/** Read a File/Blob as ArrayBuffer using FileReader (works in jsdom + browser) */
export function readFileAsArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}
