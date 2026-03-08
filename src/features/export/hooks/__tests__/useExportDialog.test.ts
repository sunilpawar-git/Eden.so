import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { exportStrings } from '../../strings/exportStrings';
import type { BranchNode } from '../../services/branchTraversal';

const mockPolish = vi.fn();
const mockDownload = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockTrack = vi.fn();

vi.mock('../../services/polishService', () => ({
    polishExport: (...args: unknown[]) => mockPolish(...args),
}));

vi.mock('@/shared/utils/fileDownload', () => ({
    downloadAsFile: (...args: unknown[]) => mockDownload(...args),
}));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: {
        success: (...args: unknown[]) => mockToastSuccess(...args),
        error: (...args: unknown[]) => mockToastError(...args),
        info: vi.fn(),
        warning: vi.fn(),
    },
}));

vi.mock('@/shared/services/analyticsService', () => ({
    trackSettingsChanged: (...args: unknown[]) => mockTrack(...args),
}));

const { useExportDialog } = await import('../useExportDialog');

function makeRoots(): readonly BranchNode[] {
    return [{
        id: 'r1',
        heading: 'Root',
        content: 'Root content',
        attachments: [],
        tags: [],
        children: [],
        depth: 0,
        isSynthesis: false,
        synthesisSourceCount: 0,
    }];
}

describe('useExportDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.assign(navigator, {
            clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
        });
    });

    test('initial markdown generated from branchToMarkdown(roots)', () => {
        const { result } = renderHook(() => useExportDialog(makeRoots()));
        expect(result.current.markdown).toContain('# Root');
        expect(result.current.markdown).toContain('Root content');
    });

    test('togglePolish calls polishExport with current markdown', async () => {
        mockPolish.mockResolvedValue('polished');
        const { result } = renderHook(() => useExportDialog(makeRoots()));

        await act(async () => {
            await result.current.togglePolish();
        });

        expect(mockPolish).toHaveBeenCalledOnce();
        expect(result.current.markdown).toBe('polished');
    });

    test('togglePolish again reverts to raw markdown', async () => {
        mockPolish.mockResolvedValue('polished');
        const { result } = renderHook(() => useExportDialog(makeRoots()));

        await act(async () => { await result.current.togglePolish(); });
        expect(result.current.markdown).toBe('polished');

        await act(async () => { await result.current.togglePolish(); });
        expect(result.current.markdown).toContain('# Root');
    });

    test('copyToClipboard calls navigator.clipboard.writeText', async () => {
        const { result } = renderHook(() => useExportDialog(makeRoots()));
        await act(async () => { await result.current.copyToClipboard(); });
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(result.current.markdown);
    });

    test('copyToClipboard shows toast.success on success', async () => {
        const { result } = renderHook(() => useExportDialog(makeRoots()));
        await act(async () => { await result.current.copyToClipboard(); });
        expect(mockToastSuccess).toHaveBeenCalledWith(exportStrings.labels.copied);
    });

    test('copyToClipboard shows toast.error on clipboard failure', async () => {
        Object.assign(navigator, {
            clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
        });
        const { result } = renderHook(() => useExportDialog(makeRoots()));
        await act(async () => { await result.current.copyToClipboard(); });
        expect(mockToastError).toHaveBeenCalledWith(exportStrings.labels.exportError);
    });

    test('download calls downloadAsFile with text/markdown mimeType', () => {
        const { result } = renderHook(() => useExportDialog(makeRoots()));
        act(() => { result.current.download(); });
        expect(mockDownload).toHaveBeenCalledOnce();
        expect(mockDownload.mock.calls[0]![2]).toBe('text/markdown');
    });

    test('download calls trackSettingsChanged for analytics', () => {
        const { result } = renderHook(() => useExportDialog(makeRoots()));
        act(() => { result.current.download(); });
        expect(mockTrack).toHaveBeenCalledWith('branch_export', 'download');
    });

    test('polish error preserves original markdown and shows toast.error', async () => {
        mockPolish.mockRejectedValue(new Error('fail'));
        const { result } = renderHook(() => useExportDialog(makeRoots()));

        await act(async () => { await result.current.togglePolish(); });

        expect(result.current.markdown).toContain('# Root');
        expect(mockToastError).toHaveBeenCalledWith(exportStrings.labels.exportError);
    });

    test('empty roots produces empty markdown without crash', () => {
        const { result } = renderHook(() => useExportDialog([]));
        expect(result.current.markdown).toBe('');
    });
});
