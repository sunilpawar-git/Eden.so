/**
 * UpgradeWall tests — verifies rendering for each limit kind,
 * correct strings, and callback invocations.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpgradeWall } from '../UpgradeWall';
import { strings } from '@/shared/localization/strings';
import type { LimitKind } from '../../types/tierLimits';

describe('UpgradeWall', () => {
    const defaultProps = {
        limitKind: 'workspace' as LimitKind,
        current: 5,
        max: 5,
        onDismiss: vi.fn(),
        onUpgrade: vi.fn(),
    };

    it('renders with dialog role and aria-modal', () => {
        render(<UpgradeWall {...defaultProps} />);
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('shows workspace limit message', () => {
        render(<UpgradeWall {...defaultProps} limitKind="workspace" />);
        expect(screen.getByText(strings.subscription.limits.workspaceLimit)).toBeInTheDocument();
    });

    it('shows node limit message', () => {
        render(<UpgradeWall {...defaultProps} limitKind="node" current={12} max={12} />);
        expect(screen.getByText(strings.subscription.limits.nodeLimit)).toBeInTheDocument();
    });

    it('shows AI daily limit message', () => {
        render(<UpgradeWall {...defaultProps} limitKind="aiDaily" current={60} max={60} />);
        expect(screen.getByText(strings.subscription.limits.aiDailyLimit)).toBeInTheDocument();
    });

    it('shows storage limit message', () => {
        render(<UpgradeWall {...defaultProps} limitKind="storage" current={50} max={50} />);
        expect(screen.getByText(strings.subscription.limits.storageLimit)).toBeInTheDocument();
    });

    it('displays current/max counts', () => {
        render(<UpgradeWall {...defaultProps} current={5} max={5} />);
        expect(screen.getByText(/5\/5/)).toBeInTheDocument();
    });

    it('fires onUpgrade when CTA clicked', () => {
        const onUpgrade = vi.fn();
        render(<UpgradeWall {...defaultProps} onUpgrade={onUpgrade} />);
        fireEvent.click(screen.getByText(strings.subscription.upgradeCta));
        expect(onUpgrade).toHaveBeenCalledOnce();
    });

    it('fires onDismiss when dismiss clicked', () => {
        const onDismiss = vi.fn();
        render(<UpgradeWall {...defaultProps} onDismiss={onDismiss} />);
        fireEvent.click(screen.getByText(strings.subscription.dismissUpgrade));
        expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('shows upgrade title', () => {
        render(<UpgradeWall {...defaultProps} />);
        expect(screen.getByText(strings.subscription.upgradeTitle)).toBeInTheDocument();
    });
});
