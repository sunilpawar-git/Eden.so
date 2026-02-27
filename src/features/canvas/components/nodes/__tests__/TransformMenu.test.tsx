/**
 * TransformMenu Tests — controlled portal dropdown
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useState } from 'react';
import { TransformMenu } from '../TransformMenu';
import { strings } from '@/shared/localization/strings';

describe('TransformMenu', () => {
    const mockOnTransform = vi.fn();
    const mockOnRegenerate = vi.fn();

    function Controlled({
        disabled = false,
        isTransforming = false,
        withRegenerate = false,
    }: {
        disabled?: boolean;
        isTransforming?: boolean;
        withRegenerate?: boolean;
    }) {
        const [isOpen, setIsOpen] = useState(false);
        return (
            <TransformMenu
                onTransform={mockOnTransform}
                isOpen={isOpen}
                onToggle={() => setIsOpen((prev) => !prev)}
                onClose={() => setIsOpen(false)}
                onRegenerate={withRegenerate ? mockOnRegenerate : undefined}
                disabled={disabled}
                isTransforming={isTransforming}
            />
        );
    }

    beforeEach(() => {
        vi.clearAllMocks();
        cleanup();
    });

    it('renders transform button', () => {
        render(<Controlled />);
        expect(screen.getByRole('button', { name: strings.ideaCard.transform })).toBeInTheDocument();
    });

    it('shows all transform options when opened', () => {
        render(<Controlled />);
        fireEvent.click(screen.getByRole('button', { name: strings.ideaCard.transform }));
        expect(screen.getByText(strings.transformations.refine)).toBeInTheDocument();
        expect(screen.getByText(strings.transformations.shorten)).toBeInTheDocument();
        expect(screen.getByText(strings.transformations.lengthen)).toBeInTheDocument();
        expect(screen.getByText(strings.transformations.proofread)).toBeInTheDocument();
    });

    it('renders dropdown in portal', () => {
        render(<Controlled />);
        fireEvent.click(screen.getByRole('button', { name: strings.ideaCard.transform }));
        const portalMenu = document.querySelector('[data-testid="transform-menu-portal"]');
        expect(portalMenu).toBeInTheDocument();
        expect(portalMenu?.parentElement).toBe(document.body);
    });

    it('calls onTransform and closes on option select', () => {
        render(<Controlled />);
        fireEvent.click(screen.getByRole('button', { name: strings.ideaCard.transform }));
        fireEvent.click(screen.getByText(strings.transformations.refine));
        expect(mockOnTransform).toHaveBeenCalledWith('refine');
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('shows regenerate option when onRegenerate is provided', () => {
        render(<Controlled withRegenerate />);
        fireEvent.click(screen.getByRole('button', { name: strings.ideaCard.transform }));
        expect(screen.getByText(strings.nodeUtils.regenerate)).toBeInTheDocument();
    });

    it('calls onRegenerate and closes when regenerate clicked', () => {
        render(<Controlled withRegenerate />);
        fireEvent.click(screen.getByRole('button', { name: strings.ideaCard.transform }));
        fireEvent.click(screen.getByText(strings.nodeUtils.regenerate));
        expect(mockOnRegenerate).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('disables button when disabled prop is true', () => {
        render(<Controlled disabled />);
        expect(screen.getByRole('button', { name: strings.ideaCard.transform })).toBeDisabled();
    });

    it('disables button and shows loading icon when transforming', () => {
        render(<Controlled isTransforming />);
        expect(screen.getByRole('button', { name: strings.ideaCard.transforming })).toBeDisabled();
        expect(screen.getByText('⏳')).toBeInTheDocument();
    });

    it('does not open menu when disabled', () => {
        render(<Controlled disabled />);
        fireEvent.click(screen.getByRole('button', { name: strings.ideaCard.transform }));
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('updates aria-expanded when open', () => {
        render(<Controlled />);
        const button = screen.getByRole('button', { name: strings.ideaCard.transform });
        expect(button).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(button);
        expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('dropdown positions to the side of the button via inline style', () => {
        render(<Controlled />);
        fireEvent.click(screen.getByRole('button', { name: strings.ideaCard.transform }));
        const portal = document.querySelector('[data-testid="transform-menu-portal"]') as HTMLElement;
        expect(portal).toBeInTheDocument();
        expect(portal.style.top).toBeDefined();
        expect(portal.style.left).toBeDefined();
    });
});
