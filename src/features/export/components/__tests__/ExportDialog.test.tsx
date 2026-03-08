import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { exportStrings } from '../../strings/exportStrings';
import type { BranchNode } from '../../services/branchTraversal';

vi.mock('../../services/polishService', () => ({
    polishExport: vi.fn().mockResolvedValue('polished'),
}));

vi.mock('@/shared/utils/fileDownload', () => ({
    downloadAsFile: vi.fn(),
}));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/shared/services/analyticsService', () => ({
    trackSettingsChanged: vi.fn(),
}));

vi.mock('@/shared/components/MarkdownRenderer', () => ({
    MarkdownRenderer: ({ content }: { content: string }) => <div data-testid="md-renderer">{content}</div>,
}));

vi.mock('@/shared/services/sentryService', () => ({
    captureError: vi.fn(),
}));

const { ExportDialog } = await import('../ExportDialog');

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

describe('ExportDialog', () => {
    const mockClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        Object.assign(navigator, {
            clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
        });
    });

    test('renders preview with markdown content via MarkdownRenderer', () => {
        render(<ExportDialog roots={makeRoots()} onClose={mockClose} />);
        expect(screen.getByTestId('md-renderer')).toBeInTheDocument();
        expect(screen.getByTestId('md-renderer').textContent).toContain('Root');
    });

    test('copy button calls navigator.clipboard.writeText', async () => {
        render(<ExportDialog roots={makeRoots()} onClose={mockClose} />);
        const copyBtn = screen.getByText(exportStrings.labels.copyToClipboard);
        fireEvent.click(copyBtn);
        await vi.waitFor(() => {
            expect(navigator.clipboard.writeText).toHaveBeenCalled();
        });
    });

    test('download button present', () => {
        render(<ExportDialog roots={makeRoots()} onClose={mockClose} />);
        expect(screen.getByText(exportStrings.labels.download)).toBeInTheDocument();
    });

    test('polish button present and not disabled initially', () => {
        render(<ExportDialog roots={makeRoots()} onClose={mockClose} />);
        const polishBtn = screen.getByText(exportStrings.labels.polish);
        expect(polishBtn).not.toBeDisabled();
    });

    test('close button calls onClose', () => {
        render(<ExportDialog roots={makeRoots()} onClose={mockClose} />);
        const closeBtn = screen.getByRole('button', { name: /\u00D7/i });
        fireEvent.click(closeBtn);
        expect(mockClose).toHaveBeenCalledOnce();
    });

    test('Escape key calls onClose', () => {
        render(<ExportDialog roots={makeRoots()} onClose={mockClose} />);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(mockClose).toHaveBeenCalledOnce();
    });

    test('backdrop click calls onClose', () => {
        render(<ExportDialog roots={makeRoots()} onClose={mockClose} />);
        const backdrop = document.querySelector('[class*="backdrop"]');
        expect(backdrop).toBeTruthy();
        fireEvent.click(backdrop!);
        expect(mockClose).toHaveBeenCalledOnce();
    });

    test('content click does NOT close (stopPropagation)', () => {
        render(<ExportDialog roots={makeRoots()} onClose={mockClose} />);
        const dialog = screen.getByRole('dialog');
        fireEvent.click(dialog);
        expect(mockClose).not.toHaveBeenCalled();
    });

    test('dialog has aria-modal and role attributes', () => {
        render(<ExportDialog roots={makeRoots()} onClose={mockClose} />);
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    test('all labels from exportStrings', () => {
        render(<ExportDialog roots={makeRoots()} onClose={mockClose} />);
        expect(screen.getByText(exportStrings.labels.exportSelection)).toBeInTheDocument();
        expect(screen.getByText(exportStrings.labels.polish)).toBeInTheDocument();
        expect(screen.getByText(exportStrings.labels.copyToClipboard)).toBeInTheDocument();
        expect(screen.getByText(exportStrings.labels.download)).toBeInTheDocument();
    });

    test('renders in portal (document.body)', () => {
        render(<ExportDialog roots={makeRoots()} onClose={mockClose} />);
        const dialog = screen.getByRole('dialog');
        expect(dialog.closest('body')).toBe(document.body);
    });
});
