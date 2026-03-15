/**
 * PortalTooltip Tests — TDD RED phase
 * Tests for the portal-based tooltip shared component
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { PortalTooltip } from '../PortalTooltip';


/** Helper: creates a target ref with mocked getBoundingClientRect */
function createMockTargetRef(rect: Partial<DOMRect> = {}) {
    const ref = createRef<HTMLDivElement>();
    const div = document.createElement('div');
    div.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        left: 200,
        right: 240,
        bottom: 140,
        width: 40,
        height: 40,
        x: 200,
        y: 100,
        toJSON: vi.fn(),
        ...rect,
    }));
    document.body.appendChild(div);
    // Use Object.defineProperty to set the ref's current value
    Object.defineProperty(ref, 'current', { value: div, writable: false });
    return { ref, cleanup: () => div.remove() };
}

describe('PortalTooltip', () => {
    let mockTarget: ReturnType<typeof createMockTargetRef>;

    beforeEach(() => {
        mockTarget = createMockTargetRef();
    });

    afterEach(() => {
        mockTarget.cleanup();
    });

    it('renders nothing when visible is false', () => {
        render(
            <PortalTooltip
                text="Tags"
                targetRef={mockTarget.ref}
                visible={false}
            />
        );

        expect(screen.queryByText('Tags')).not.toBeInTheDocument();
    });

    it('renders tooltip text in a portal when visible is true', () => {
        render(
            <PortalTooltip
                text="Tags"
                targetRef={mockTarget.ref}
                visible={true}
            />
        );

        expect(screen.getByText('Tags')).toBeInTheDocument();
    });

    it('renders tooltip in document.body (portal), not inline', () => {
        const { container } = render(
            <PortalTooltip
                text="Connect"
                targetRef={mockTarget.ref}
                visible={true}
            />
        );

        expect(container.querySelector('[data-testid="portal-tooltip"]')).toBeNull();
        expect(document.body.querySelector('[data-testid="portal-tooltip"]')).toBeInTheDocument();
    });

    it('positions tooltip relative to target element', () => {
        render(
            <PortalTooltip
                text="Delete"
                targetRef={mockTarget.ref}
                visible={true}
            />
        );

        const tooltip = document.body.querySelector('[data-testid="portal-tooltip"]') as HTMLElement;
        expect(tooltip).toBeInTheDocument();
        expect(tooltip.style.top).toBeTruthy();
        expect(tooltip.style.left).toBeTruthy();
    });

    it('applies tooltip role and visible styling', () => {
        render(
            <PortalTooltip
                text="Copy"
                targetRef={mockTarget.ref}
                visible={true}
            />
        );

        const tooltip = document.body.querySelector('[role="tooltip"]');
        expect(tooltip).toBeInTheDocument();
        expect(tooltip?.className).toMatch(/opacity-100/);
    });

    it('renders keyboard shortcut hint when shortcut prop is provided', () => {
        render(
            <PortalTooltip
                text="Delete"
                shortcut="⌫"
                targetRef={mockTarget.ref}
                visible={true}
            />
        );

        expect(screen.getByText('Delete')).toBeInTheDocument();
        expect(screen.getByText('⌫')).toBeInTheDocument();
    });

    it('does not render shortcut area when shortcut prop is omitted', () => {
        render(
            <PortalTooltip
                text="Tags"
                targetRef={mockTarget.ref}
                visible={true}
            />
        );

        expect(screen.getByText('Tags')).toBeInTheDocument();
        const tooltip = document.body.querySelector('[data-testid="portal-tooltip"]');
        const spans = tooltip?.querySelectorAll('span') ?? [];
        expect(spans).toHaveLength(1);
    });

    it('supports placement left (positions to left of target via inline style)', () => {
        render(
            <PortalTooltip
                text="Tags"
                targetRef={mockTarget.ref}
                visible={true}
                placement="left"
            />
        );

        const tooltip = document.body.querySelector('[data-testid="portal-tooltip"]') as HTMLElement;
        expect(tooltip).toBeInTheDocument();
        expect(tooltip.style.transform).toContain('translateX(-100%)');
    });

    it('defaults to placement right (no translateX(-100%)) when not specified', () => {
        render(
            <PortalTooltip
                text="Tags"
                targetRef={mockTarget.ref}
                visible={true}
            />
        );

        const tooltip = document.body.querySelector('[data-testid="portal-tooltip"]') as HTMLElement;
        expect(tooltip).toBeInTheDocument();
        expect(tooltip.style.transform).not.toContain('translateX(-100%)');
    });

    it('does not render when targetRef.current is null', () => {
        const nullRef = createRef<HTMLElement>();

        render(
            <PortalTooltip
                text="Tags"
                targetRef={nullRef}
                visible={true}
            />
        );

        expect(screen.queryByText('Tags')).not.toBeInTheDocument();
    });
});
