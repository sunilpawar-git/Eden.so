/**
 * TransformMenu Component Tests - TDD Phase 1
 * Tests for portal-based dropdown rendering
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TransformMenu } from '../TransformMenu';
import { strings } from '@/shared/localization/strings';

describe('TransformMenu', () => {
    const mockOnTransform = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        cleanup();
    });

    describe('Basic Rendering', () => {
        it('should render transform button', () => {
            render(<TransformMenu onTransform={mockOnTransform} />);

            const button = screen.getByRole('button', { name: strings.ideaCard.transform });
            expect(button).toBeInTheDocument();
        });

        it('should show all transform options when clicked', () => {
            render(<TransformMenu onTransform={mockOnTransform} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            expect(screen.getByText(strings.transformations.refine)).toBeInTheDocument();
            expect(screen.getByText(strings.transformations.shorten)).toBeInTheDocument();
            expect(screen.getByText(strings.transformations.lengthen)).toBeInTheDocument();
            expect(screen.getByText(strings.transformations.proofread)).toBeInTheDocument();
        });

        it('should call onTransform with correct type when option selected', () => {
            render(<TransformMenu onTransform={mockOnTransform} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            const refineOption = screen.getByText(strings.transformations.refine);
            fireEvent.click(refineOption);

            expect(mockOnTransform).toHaveBeenCalledWith('refine');
        });
    });

    describe('Portal Rendering', () => {
        it('should render dropdown in document.body via portal', () => {
            render(<TransformMenu onTransform={mockOnTransform} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            // The dropdown should be rendered in document.body, not inside the wrapper
            const portalMenu = document.querySelector('[data-testid="transform-menu-portal"]');
            expect(portalMenu).toBeInTheDocument();
            expect(portalMenu?.parentElement).toBe(document.body);
        });

        it('should have inline style positioning for dropdown', () => {
            render(<TransformMenu onTransform={mockOnTransform} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            const portalMenu = document.querySelector('[data-testid="transform-menu-portal"]');
            expect(portalMenu).toBeInTheDocument();

            // Check inline styles are applied (CSS module handles position: fixed)
            const style = (portalMenu as HTMLElement).style;
            expect(style.top).toBeDefined();
            expect(style.left).toBeDefined();
        });

        it('should position dropdown based on button location', () => {
            // Mock getBoundingClientRect for the button
            const mockRect = {
                top: 200,
                left: 100,
                width: 40,
                height: 30,
                bottom: 230,
                right: 140,
                x: 100,
                y: 200,
                toJSON: () => ({}),
            };

            render(<TransformMenu onTransform={mockOnTransform} />);

            const button = screen.getByRole('button');
            vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(mockRect);

            fireEvent.click(button);

            const portalMenu = document.querySelector('[data-testid="transform-menu-portal"]');
            expect(portalMenu).toBeInTheDocument();

            // Menu should be positioned based on button rect
            const style = (portalMenu as HTMLElement).style;
            expect(style.top).toBe('200px');
            expect(style.left).toBe('120px'); // 100 + 40/2 = 120 (centered)
        });
    });

    describe('Click Outside Behavior', () => {
        it('should close dropdown when clicking outside', () => {
            render(<TransformMenu onTransform={mockOnTransform} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            // Verify menu is open
            expect(screen.getByText(strings.transformations.refine)).toBeInTheDocument();

            // Click outside (on document body)
            fireEvent.mouseDown(document.body);

            // Menu should be closed
            expect(screen.queryByText(strings.transformations.refine)).not.toBeInTheDocument();
        });

        it('should NOT close dropdown when clicking inside menu', () => {
            render(<TransformMenu onTransform={mockOnTransform} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            const menu = document.querySelector('[data-testid="transform-menu-portal"]');
            expect(menu).toBeInTheDocument();

            // Click inside the menu (but not on an option)
            fireEvent.mouseDown(menu as Element);

            // Menu should still be open
            expect(screen.getByText(strings.transformations.refine)).toBeInTheDocument();
        });

        it('should NOT close dropdown when clicking the trigger button', () => {
            render(<TransformMenu onTransform={mockOnTransform} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            // Menu is open
            expect(screen.getByText(strings.transformations.refine)).toBeInTheDocument();

            // Click the button again (mousedown)
            fireEvent.mouseDown(button);

            // Menu should still be open (toggle will close it on click, not mousedown)
            expect(screen.getByText(strings.transformations.refine)).toBeInTheDocument();
        });
    });

    describe('Disabled States', () => {
        it('should disable button when disabled prop is true', () => {
            render(<TransformMenu onTransform={mockOnTransform} disabled={true} />);

            const button = screen.getByRole('button');
            expect(button).toBeDisabled();
        });

        it('should disable button when isTransforming is true', () => {
            render(<TransformMenu onTransform={mockOnTransform} isTransforming={true} />);

            const button = screen.getByRole('button');
            expect(button).toBeDisabled();
        });

        it('should show loading icon when isTransforming', () => {
            render(<TransformMenu onTransform={mockOnTransform} isTransforming={true} />);

            // Should show hourglass instead of sparkle
            expect(screen.getByText('⏳')).toBeInTheDocument();
        });

        it('should not open menu when disabled', () => {
            render(<TransformMenu onTransform={mockOnTransform} disabled={true} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            expect(screen.queryByText(strings.transformations.refine)).not.toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('should have correct aria attributes on button', () => {
            render(<TransformMenu onTransform={mockOnTransform} />);

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('aria-haspopup', 'menu');
            expect(button).toHaveAttribute('aria-expanded', 'false');
        });

        it('should update aria-expanded when menu is open', () => {
            render(<TransformMenu onTransform={mockOnTransform} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            expect(button).toHaveAttribute('aria-expanded', 'true');
        });

        it('should have menu role on dropdown', () => {
            render(<TransformMenu onTransform={mockOnTransform} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            expect(screen.getByRole('menu')).toBeInTheDocument();
        });

        it('should have menuitem role on options', () => {
            render(<TransformMenu onTransform={mockOnTransform} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            const menuItems = screen.getAllByRole('menuitem');
            expect(menuItems).toHaveLength(4);
        });

        it('should close menu when Escape key is pressed', () => {
            render(<TransformMenu onTransform={mockOnTransform} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            // Verify menu is open
            expect(screen.getByRole('menu')).toBeInTheDocument();

            // Press Escape
            fireEvent.keyDown(document, { key: 'Escape' });

            // Menu should be closed
            expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        });
    });
});
