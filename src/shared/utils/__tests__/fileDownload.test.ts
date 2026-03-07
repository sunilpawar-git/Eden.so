import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest';
import { downloadAsFile } from '../fileDownload';

describe('downloadAsFile', () => {
    let mockClick: ReturnType<typeof vi.fn>;
    let capturedDownload: string;
    let capturedHref: string;

    beforeEach(() => {
        vi.useFakeTimers();

        globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url');
        globalThis.URL.revokeObjectURL = vi.fn();

        mockClick = vi.fn();
        capturedDownload = '';
        capturedHref = '';

        vi.spyOn(document, 'createElement').mockReturnValue({
            set href(v: string) { capturedHref = v; },
            get href() { return capturedHref; },
            set download(v: string) { capturedDownload = v; },
            get download() { return capturedDownload; },
            click: mockClick,
        } as unknown as HTMLAnchorElement);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    test('creates Blob with correct content and mimeType', () => {
        let capturedParts: BlobPart[] = [];
        let capturedOptions: BlobPropertyBag | undefined;
        const OriginalBlob = globalThis.Blob;

        globalThis.Blob = class MockBlob extends OriginalBlob {
            constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
                super(parts, options);
                capturedParts = parts ?? [];
                capturedOptions = options;
            }
        };

        downloadAsFile('hello', 'test.md', 'text/markdown');
        expect(capturedParts).toEqual(['hello']);
        expect(capturedOptions).toEqual({ type: 'text/markdown' });

        globalThis.Blob = OriginalBlob;
    });

    test('sets anchor.download to filename', () => {
        downloadAsFile('content', 'my-file.md', 'text/markdown');
        expect(capturedDownload).toBe('my-file.md');
    });

    test('calls anchor.click()', () => {
        downloadAsFile('content', 'test.md', 'text/markdown');
        expect(mockClick).toHaveBeenCalledOnce();
    });

    test('revokes URL after delay, not immediately', () => {
        downloadAsFile('content', 'test.md', 'text/markdown');
        expect(globalThis.URL.revokeObjectURL).not.toHaveBeenCalled();

        vi.advanceTimersByTime(200);
        expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });
});
