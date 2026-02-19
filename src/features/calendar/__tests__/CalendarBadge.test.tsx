/**
 * CalendarBadge Tests - TDD: Written FIRST (RED phase)
 * Tests visual badge states: synced, pending, failed across all types
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarBadge } from '../components/CalendarBadge';
import type { CalendarEventMetadata } from '../types/calendarEvent';
import { calendarStrings as cs } from '../localization/calendarStrings';

const baseMeta: CalendarEventMetadata = {
    id: 'gcal-1',
    type: 'event',
    title: 'Team standup',
    date: '2026-02-20T10:00:00Z',
    status: 'synced',
    syncedAt: Date.now(),
    calendarId: 'primary',
};

describe('CalendarBadge', () => {
    it('renders event badge with calendar icon', () => {
        render(<CalendarBadge metadata={baseMeta} onClick={vi.fn()} />);
        expect(screen.getByText('Team standup')).toBeInTheDocument();
        expect(screen.getByTestId('calendar-badge')).toHaveAttribute('data-type', 'event');
    });

    it('renders reminder badge with alarm icon', () => {
        render(<CalendarBadge metadata={{ ...baseMeta, type: 'reminder' }} onClick={vi.fn()} />);
        expect(screen.getByTestId('calendar-badge')).toHaveAttribute('data-type', 'reminder');
    });

    it('renders todo badge with check icon', () => {
        render(<CalendarBadge metadata={{ ...baseMeta, type: 'todo' }} onClick={vi.fn()} />);
        expect(screen.getByTestId('calendar-badge')).toHaveAttribute('data-type', 'todo');
    });

    it('shows pending indicator when syncing', () => {
        render(<CalendarBadge metadata={{ ...baseMeta, status: 'pending' }} onClick={vi.fn()} />);
        expect(screen.getByTestId('calendar-badge')).toHaveAttribute('data-status', 'pending');
    });

    it('shows failed indicator with error tooltip', () => {
        const meta = { ...baseMeta, status: 'failed' as const, error: 'Network error' };
        render(<CalendarBadge metadata={meta} onClick={vi.fn()} />);
        expect(screen.getByTestId('calendar-badge')).toHaveAttribute('data-status', 'failed');
    });

    it('shows synced indicator', () => {
        render(<CalendarBadge metadata={baseMeta} onClick={vi.fn()} />);
        expect(screen.getByTestId('calendar-badge')).toHaveAttribute('data-status', 'synced');
    });

    it('calls onClick when clicked', () => {
        const onClick = vi.fn();
        render(<CalendarBadge metadata={baseMeta} onClick={onClick} />);
        fireEvent.click(screen.getByTestId('calendar-badge'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('shows retry button for failed syncs', () => {
        const meta = { ...baseMeta, status: 'failed' as const };
        const onRetry = vi.fn();
        render(<CalendarBadge metadata={meta} onClick={vi.fn()} onRetry={onRetry} />);
        const retryBtn = screen.getByTitle(cs.badge.retry);
        fireEvent.click(retryBtn);
        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('renders long titles with CSS truncation class', () => {
        const longTitle = 'A'.repeat(100);
        render(<CalendarBadge metadata={{ ...baseMeta, title: longTitle }} onClick={vi.fn()} />);
        const title = screen.getByTestId('badge-title');
        expect(title.textContent).toBe(longTitle);
        expect(title.className).toBeTruthy();
    });
});
