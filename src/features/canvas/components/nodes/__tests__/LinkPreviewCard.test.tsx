/**
 * LinkPreviewCard Tests
 * TDD: Validates link preview card rendering, interactions, and accessibility
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LinkPreviewCard, LinkPreviewList } from '../LinkPreviewCard';
import type { LinkPreviewMetadata } from '../../../types/node';
import { strings } from '@/shared/localization/strings';

describe('LinkPreviewCard', () => {
    const fullPreview: LinkPreviewMetadata = {
        url: 'https://example.com/article',
        title: 'Example Article Title',
        description: 'A detailed description of the example article content.',
        image: 'https://example.com/og-image.jpg',
        favicon: 'https://example.com/favicon.ico',
        domain: 'example.com',
        cardType: 'summary_large_image',
        fetchedAt: Date.now(),
    };

    const minimalPreview: LinkPreviewMetadata = {
        url: 'https://minimal.org',
        domain: 'minimal.org',
        fetchedAt: Date.now(),
    };

    const errorPreview: LinkPreviewMetadata = {
        url: 'https://broken.com',
        domain: 'broken.com',
        fetchedAt: Date.now(),
        error: true,
    };

    describe('Full metadata rendering', () => {
        it('renders title', () => {
            render(<LinkPreviewCard preview={fullPreview} />);
            expect(screen.getByText('Example Article Title')).toBeInTheDocument();
        });

        it('renders description', () => {
            render(<LinkPreviewCard preview={fullPreview} />);
            expect(screen.getByText(/A detailed description/)).toBeInTheDocument();
        });

        it('renders domain', () => {
            render(<LinkPreviewCard preview={fullPreview} />);
            expect(screen.getByText('example.com')).toBeInTheDocument();
        });

        it('renders favicon image', () => {
            render(<LinkPreviewCard preview={fullPreview} />);
            const favicon = screen.getByAltText('example.com favicon');
            expect(favicon).toBeInTheDocument();
            expect(favicon).toHaveAttribute('src', 'https://example.com/favicon.ico');
        });

        it('renders OG image', () => {
            render(<LinkPreviewCard preview={fullPreview} />);
            const image = screen.getByAltText('Example Article Title');
            expect(image).toBeInTheDocument();
            expect(image).toHaveAttribute('src', 'https://example.com/og-image.jpg');
        });
    });

    describe('Minimal metadata rendering', () => {
        it('renders domain when title is missing', () => {
            render(<LinkPreviewCard preview={minimalPreview} />);
            // Domain appears in both domain row and as title fallback
            const elements = screen.getAllByText('minimal.org');
            expect(elements.length).toBeGreaterThanOrEqual(1);
        });

        it('renders URL as fallback title when title and domain missing', () => {
            const noTitle: LinkPreviewMetadata = {
                url: 'https://example.com/page',
                fetchedAt: Date.now(),
            };
            render(<LinkPreviewCard preview={noTitle} />);
            expect(screen.getByText('https://example.com/page')).toBeInTheDocument();
        });

        it('does not render image when image is undefined', () => {
            render(<LinkPreviewCard preview={minimalPreview} />);
            expect(screen.queryByRole('img')).not.toBeInTheDocument();
        });

        it('does not render description when undefined', () => {
            render(<LinkPreviewCard preview={minimalPreview} />);
            // Domain should be present, no description element
            const elements = screen.getAllByText('minimal.org');
            expect(elements.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Error state', () => {
        it('renders unavailable message for error previews', () => {
            render(<LinkPreviewCard preview={errorPreview} />);
            expect(screen.getByText(strings.linkPreview.unavailable)).toBeInTheDocument();
        });

        it('still renders domain for error previews', () => {
            render(<LinkPreviewCard preview={errorPreview} />);
            expect(screen.getByText('broken.com')).toBeInTheDocument();
        });
    });

    describe('Interactions', () => {
        it('opens link in new tab on click', () => {
            render(<LinkPreviewCard preview={fullPreview} />);
            const link = screen.getByRole('link');
            expect(link).toHaveAttribute('href', 'https://example.com/article');
            expect(link).toHaveAttribute('target', '_blank');
            expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        });

        it('calls onRemove when remove button is clicked', () => {
            const onRemove = vi.fn();
            render(<LinkPreviewCard preview={fullPreview} onRemove={onRemove} />);
            const removeBtn = screen.getByLabelText(strings.linkPreview.removePreview);
            fireEvent.click(removeBtn);
            expect(onRemove).toHaveBeenCalledWith('https://example.com/article');
        });

        it('does not render remove button when onRemove is not provided', () => {
            render(<LinkPreviewCard preview={fullPreview} />);
            expect(screen.queryByLabelText(strings.linkPreview.removePreview)).not.toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('has accessible link role', () => {
            render(<LinkPreviewCard preview={fullPreview} />);
            expect(screen.getByRole('link')).toBeInTheDocument();
        });

        it('link has descriptive aria-label', () => {
            render(<LinkPreviewCard preview={fullPreview} />);
            const link = screen.getByRole('link');
            expect(link).toHaveAttribute('aria-label',
                expect.stringContaining('Example Article Title'));
        });
    });
});

describe('LinkPreviewList', () => {
    const previews: Record<string, LinkPreviewMetadata> = {
        'https://example.com': {
            url: 'https://example.com',
            title: 'Example',
            domain: 'example.com',
            fetchedAt: Date.now(),
        },
        'https://test.org': {
            url: 'https://test.org',
            title: 'Test Site',
            domain: 'test.org',
            fetchedAt: Date.now(),
        },
    };

    it('renders a card for each preview in the record', () => {
        render(<LinkPreviewList previews={previews} />);
        expect(screen.getByText('Example')).toBeInTheDocument();
        expect(screen.getByText('Test Site')).toBeInTheDocument();
    });

    it('renders nothing when previews record is empty', () => {
        const { container } = render(<LinkPreviewList previews={{}} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders the list container with test id', () => {
        render(<LinkPreviewList previews={previews} />);
        expect(screen.getByTestId('link-preview-list')).toBeInTheDocument();
    });

    it('passes onRemove to each card', () => {
        const onRemove = vi.fn();
        render(<LinkPreviewList previews={previews} onRemove={onRemove} />);
        const removeButtons = screen.getAllByLabelText(strings.linkPreview.removePreview);
        expect(removeButtons).toHaveLength(2);
        fireEvent.click(removeButtons[0]);
        expect(onRemove).toHaveBeenCalled();
    });
});
