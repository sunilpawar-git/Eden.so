/**
 * MarkdownRenderer Component Tests - TDD: Write tests FIRST
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownRenderer } from '../MarkdownRenderer';

describe('MarkdownRenderer', () => {
    describe('Basic rendering', () => {
        it('renders plain text correctly', () => {
            render(<MarkdownRenderer content="Hello world" />);
            expect(screen.getByText('Hello world')).toBeInTheDocument();
        });

        it('renders empty string without error', () => {
            const { container } = render(<MarkdownRenderer content="" />);
            expect(container).toBeInTheDocument();
        });
    });

    describe('Markdown formatting', () => {
        it('renders bold text as strong element', () => {
            render(<MarkdownRenderer content="This is **bold** text" />);
            const strongElement = screen.getByText('bold');
            expect(strongElement.tagName).toBe('STRONG');
        });

        it('renders italic text as em element', () => {
            render(<MarkdownRenderer content="This is *italic* text" />);
            const emElement = screen.getByText('italic');
            expect(emElement.tagName).toBe('EM');
        });

        it('renders unordered lists correctly', () => {
            const listContent = `- Item 1
- Item 2
- Item 3`;
            render(<MarkdownRenderer content={listContent} />);
            expect(screen.getByText('Item 1')).toBeInTheDocument();
            expect(screen.getByText('Item 2')).toBeInTheDocument();
            expect(screen.getByText('Item 3')).toBeInTheDocument();
        });

        it('renders ordered lists correctly', () => {
            const listContent = `1. First
2. Second`;
            render(<MarkdownRenderer content={listContent} />);
            expect(screen.getByText('First')).toBeInTheDocument();
            expect(screen.getByText('Second')).toBeInTheDocument();
        });

        it('renders headings correctly', () => {
            render(<MarkdownRenderer content="## Heading" />);
            const heading = screen.getByRole('heading', { level: 2 });
            expect(heading).toHaveTextContent('Heading');
        });

        it('renders code inline correctly', () => {
            render(<MarkdownRenderer content="Use `code` here" />);
            const codeElement = screen.getByText('code');
            expect(codeElement.tagName).toBe('CODE');
        });

        it('renders paragraphs with line breaks', () => {
            const content = `Line one

Line two`;
            render(<MarkdownRenderer content={content} />);
            expect(screen.getByText('Line one')).toBeInTheDocument();
            expect(screen.getByText('Line two')).toBeInTheDocument();
        });
    });

    describe('XSS Prevention', () => {
        it('does not render script tags', () => {
            const { container } = render(
                <MarkdownRenderer content="<script>alert('xss')</script>" />
            );
            const scripts = container.querySelectorAll('script');
            expect(scripts.length).toBe(0);
        });

        it('sanitizes HTML in markdown', () => {
            const { container } = render(
                <MarkdownRenderer content="<img src='x' onerror='alert(1)'>" />
            );
            // react-markdown by default doesn't render raw HTML
            const images = container.querySelectorAll('img');
            expect(images.length).toBe(0);
        });
    });

    describe('Custom styling', () => {
        it('applies custom className when provided', () => {
            const { container } = render(
                <MarkdownRenderer content="Test" className="custom-class" />
            );
            expect(container.firstChild).toHaveClass('custom-class');
        });
    });
});
