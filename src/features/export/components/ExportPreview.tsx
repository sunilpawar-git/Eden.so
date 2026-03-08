import React from 'react';
import { MarkdownRenderer } from '@/shared/components/MarkdownRenderer';
import styles from './ExportDialog.module.css';

interface ExportPreviewProps {
    readonly content: string;
}

export const ExportPreview = React.memo(function ExportPreview({ content }: ExportPreviewProps) {
    return (
        <div className={styles.preview}>
            <MarkdownRenderer content={content} className={styles.previewContent} />
        </div>
    );
});
