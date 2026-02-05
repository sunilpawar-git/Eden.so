/**
 * MarkdownRenderer - Renders markdown content as formatted HTML
 * Uses react-markdown for safe rendering (XSS prevention built-in)
 */
import React from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './MarkdownRenderer.module.css';

interface MarkdownRendererProps {
    /** Markdown content to render */
    content: string;
    /** Optional additional CSS class name */
    className?: string;
}

export const MarkdownRenderer = React.memo(({
    content,
    className,
}: MarkdownRendererProps) => {
    const combinedClassName = className 
        ? `${styles.markdownContent} ${className}` 
        : styles.markdownContent;
    
    return (
        <div className={combinedClassName}>
            <ReactMarkdown>{content}</ReactMarkdown>
        </div>
    );
});
