/**
 * CalendarBadge - Visual indicator for calendar items on IdeaCard nodes
 * Displays type icon, title, date, and sync status
 */
import React from 'react';
import type { CalendarEventMetadata } from '../types/calendarEvent';
import { calendarStrings as cs } from '../localization/calendarStrings';
import styles from './CalendarBadge.module.css';

const TYPE_ICONS: Record<string, string> = {
    event: '📅',
    reminder: '⏰',
    todo: '✓',
};

const STATUS_ICONS: Record<string, string> = {
    synced: '✓',
    pending: '⏳',
    failed: '⚠️',
};

const DEFAULT_TYPE_ICON = '📋';
const DEFAULT_STATUS_ICON = '?';

interface CalendarBadgeProps {
    metadata: CalendarEventMetadata;
    onClick?: () => void;
    onRetry?: () => void;
}

function formatBadgeDate(isoDate: string): string {
    try {
        const d = new Date(isoDate);
        const datePart = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const timePart = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
        return `${datePart}, ${timePart}`;
    } catch {
        return '';
    }
}

export const CalendarBadge = React.memo(({ metadata, onClick, onRetry }: CalendarBadgeProps) => {
    const { type, title, date, status, error } = metadata;

    const handleRetryClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRetry?.();
    };

    const badgeTitle = status === 'failed' ? (error ?? cs.errors.createFailed) : cs.badge.viewEvent;
    const Tag = onClick ? 'button' : 'div';

    return (
        <Tag
            className={styles.badge}
            data-testid="calendar-badge"
            data-type={type}
            data-status={status}
            onClick={onClick}
            title={badgeTitle}
            {...(onClick ? { type: 'button' as const } : {})}
        >
            <span className={styles.icon}>{TYPE_ICONS[type] ?? DEFAULT_TYPE_ICON}</span>
            <span className={styles.title} data-testid="badge-title">{title}</span>
            <span className={styles.date} data-testid="badge-date">{formatBadgeDate(date)}</span>
            <span className={styles.status}>{STATUS_ICONS[status] ?? DEFAULT_STATUS_ICON}</span>
            {(status === 'failed' || status === 'pending') && onRetry && (
                <span
                    className={styles.retryBtn}
                    onClick={handleRetryClick}
                    title={cs.badge.retry}
                    role="button"
                    tabIndex={0}
                >
                    ↻
                </span>
            )}
        </Tag>
    );
});
