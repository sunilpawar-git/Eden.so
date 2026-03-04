/**
 * Document Parsing Service — Client-side text extraction and PDF thumbnail generation
 * Pure functions (no React hooks, no Firebase).
 *
 * Performance: pdfjs-dist is lazy-loaded via dynamic import() to avoid
 * bloating the main bundle. The pdf.js worker runs off the main thread.
 */
import { strings } from '@/shared/localization/strings';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { RenderParameters, TextItem } from 'pdfjs-dist/types/src/display/api';

/** Result of parsing a document file */
export interface DocumentParseResult {
    /** Extracted plain text (concatenated pages for PDFs) */
    text: string;
    /** Base64 data URL of the first-page thumbnail (PDF only) */
    thumbnailDataUrl?: string;
}

/** Thumbnail render settings */
const THUMBNAIL_SCALE = 0.5;
const THUMBNAIL_MAX_PAGES_FOR_TEXT = 100;

/**
 * Parse a document file and extract text + optional thumbnail.
 * Routes to the correct parser based on MIME type.
 */
export async function parseDocument(file: File): Promise<DocumentParseResult> {
    switch (file.type) {
        case 'application/pdf':
            return parsePdf(file);
        case 'text/plain':
        case 'text/csv':
            return parseTextFile(file);
        default:
            throw new Error(strings.canvas.docUnsupportedType);
    }
}

/**
 * Parse a plain text or CSV file.
 * Uses FileReader.readAsText — no external dependencies.
 */
async function parseTextFile(file: File): Promise<DocumentParseResult> {
    const text = await readFileAsText(file);
    return { text };
}

/** Read a File as UTF-8 text */
function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error(strings.canvas.docReadFailed));
        reader.readAsText(file, 'utf-8');
    });
}

/** Read a File as an ArrayBuffer (JSDOM-compatible alternative to file.arrayBuffer()) */
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(new Error(strings.canvas.docReadFailed));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Parse a PDF file: extract text from all pages and render a first-page thumbnail.
 * pdfjs-dist is lazy-loaded to keep the main bundle small.
 */
async function parsePdf(file: File): Promise<DocumentParseResult> {
    await loadPdfJs();
    const { getDocument } = await import('pdfjs-dist');
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const pdf = await getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

    const [text, thumbnailDataUrl] = await Promise.all([
        extractPdfText(pdf),
        renderPdfThumbnail(pdf),
    ]);

    return { text, thumbnailDataUrl };
}

/** Lazy-load pdfjs-dist and configure its worker using the locally bundled file (CDN is unreliable for minor patch versions) */
async function loadPdfJs(): Promise<void> {
    const pdfjs = await import('pdfjs-dist');
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        // Vite ?url import copies the worker file to dist and returns its public URL.
        // This avoids CDN version-mismatch failures (e.g. 404 for patch versions).
        const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    }
}

/**
 * Extract text content from all PDF pages (up to THUMBNAIL_MAX_PAGES_FOR_TEXT).
 * Concatenates with double newlines between pages.
 */
async function extractPdfText(
    pdf: PDFDocumentProxy,
): Promise<string> {
    const pageCount = Math.min(pdf.numPages, THUMBNAIL_MAX_PAGES_FOR_TEXT);
    const pages: string[] = [];

    for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
            .filter((item): item is TextItem =>
                'str' in item)
            .map(item => item.str)
            .join(' ');
        pages.push(pageText);
    }

    return pages.join('\n\n');
}

/**
 * Render the first page of a PDF as a base64 PNG data URL thumbnail.
 * Uses an OffscreenCanvas when available, falls back to document.createElement.
 */
async function renderPdfThumbnail(
    pdf: PDFDocumentProxy,
): Promise<string> {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: THUMBNAIL_SCALE });

    const width = Math.floor(viewport.width);
    const height = Math.floor(viewport.height);

    let canvas: HTMLCanvasElement | OffscreenCanvas;
    let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

    if (typeof OffscreenCanvas !== 'undefined') {
        canvas = new OffscreenCanvas(width, height);
        ctx = canvas.getContext('2d');
    } else {
        const el = document.createElement('canvas');
        el.width = width;
        el.height = height;
        canvas = el;
        ctx = el.getContext('2d');
    }

    if (!ctx) throw new Error(strings.canvas.docParsingFailed);

    await page.render({
        canvasContext: ctx as unknown as object,
        viewport,
    } as unknown as RenderParameters).promise;

    if (canvas instanceof OffscreenCanvas) {
        const blob = await canvas.convertToBlob({ type: 'image/png' });
        return blobToDataUrl(blob);
    }
    return canvas.toDataURL('image/png');
}

/** Convert a Blob to a base64 data URL */
function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error(strings.canvas.docReadFailed));
        reader.readAsDataURL(blob);
    });
}
