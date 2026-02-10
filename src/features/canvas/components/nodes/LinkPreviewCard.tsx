/**
 * LinkPreviewCard - Rich link preview card component
 * Renders Open Graph / Twitter Card metadata as a clickable preview
 * View-only: zero business logic (MVVM)
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import type { LinkPreviewMetadata } from '../../types/node';
import styles from './LinkPreviewCard.module.css';

interface LinkPreviewCardProps {
    preview: LinkPreviewMetadata;
    onRemove?: (url: string) => void;
}

/** Single link preview card with optional remove button */
export const LinkPreviewCard = React.memo(({ preview, onRemove }: LinkPreviewCardProps) => {
    const { url, title, description, image, favicon, domain, error } = preview;
    const displayTitle = title ?? domain ?? url;
    const ariaLabel = `${strings.linkPreview.openLink}: ${displayTitle}`;

    if (error) {
        return (
            <div className={styles.card}>
                <a href={url} target="_blank" rel="noopener noreferrer"
                    className={styles.body} aria-label={ariaLabel}>
                    {domain && (
                        <span className={styles.domainRow}>
                            <span className={styles.domain}>{domain}</span>
                        </span>
                    )}
                    <span className={styles.errorText}>
                        {strings.linkPreview.unavailable}
                    </span>
                </a>
                {onRemove && (
                    <button className={styles.removeButton}
                        aria-label={strings.linkPreview.removePreview}
                        onClick={(e) => { e.preventDefault(); onRemove(url); }}>
                        ✕
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className={styles.card}>
            <a href={url} target="_blank" rel="noopener noreferrer"
                aria-label={ariaLabel}
                style={{ textDecoration: 'none', color: 'inherit' }}>
                {image && (
                    <div className={styles.imageWrapper}>
                        <img src={image} alt={displayTitle}
                            className={styles.image} loading="lazy" />
                    </div>
                )}
                <div className={styles.body}>
                    <span className={styles.domainRow}>
                        {favicon && (
                            <img src={favicon} alt={`${domain ?? ''} favicon`}
                                className={styles.favicon} />
                        )}
                        {domain && <span className={styles.domain}>{domain}</span>}
                    </span>
                    <span className={styles.title}>{displayTitle}</span>
                    {description && (
                        <span className={styles.description}>{description}</span>
                    )}
                </div>
            </a>
            {onRemove && (
                <button className={styles.removeButton}
                    aria-label={strings.linkPreview.removePreview}
                    onClick={(e) => { e.preventDefault(); onRemove(url); }}>
                    ✕
                </button>
            )}
        </div>
    );
});

interface LinkPreviewListProps {
    previews: Record<string, LinkPreviewMetadata>;
    onRemove?: (url: string) => void;
}

/** Renders a list of link preview cards from a previews record */
export const LinkPreviewList = React.memo(({ previews, onRemove }: LinkPreviewListProps) => {
    const entries = Object.values(previews);
    if (entries.length === 0) return null;

    return (
        <div className={styles.previewList} data-testid="link-preview-list">
            {entries.map((preview) => (
                <LinkPreviewCard key={preview.url} preview={preview} onRemove={onRemove} />
            ))}
        </div>
    );
});
