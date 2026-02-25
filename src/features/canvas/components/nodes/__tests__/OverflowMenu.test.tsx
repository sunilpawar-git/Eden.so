/**
 * OverflowMenu Tests — TDD
 * Controlled component: isOpen + onToggle from parent.
 * Renders items inline (no portal), icon-only TooltipButtons.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { OverflowMenu } from '../OverflowMenu';
import type { OverflowMenuItem } from '../OverflowMenu';

const makeItems = (): OverflowMenuItem[] => [
    { id: 'tags', label: 'Tags', icon: '🏷️', onClick: vi.fn() },
    { id: 'focus', label: 'Focus', icon: '🔍', onClick: vi.fn() },
];

/** Wrapper to test controlled + toggle behaviour */
function Controlled({
    initialOpen = false,
    items = makeItems(),
    children,
    disabled = false,
}: {
    initialOpen?: boolean;
    items?: OverflowMenuItem[];
    children?: React.ReactNode;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(initialOpen);
    return (
        <OverflowMenu
            items={items}
            isOpen={open}
            onToggle={() => setOpen((p) => !p)}
            disabled={disabled}
        >
            {children}
        </OverflowMenu>
    );
}

describe('OverflowMenu', () => {
    it('renders trigger button with aria-label "More actions"', () => {
        render(<Controlled />);
        expect(screen.getByLabelText('More actions')).toBeInTheDocument();
    });

    it('items are NOT in DOM when isOpen=false', () => {
        render(<Controlled initialOpen={false} />);
        expect(screen.queryByLabelText('Tags')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Focus')).not.toBeInTheDocument();
    });

    it('items ARE in DOM when isOpen=true', () => {
        render(<Controlled initialOpen={true} />);
        expect(screen.getByLabelText('Tags')).toBeInTheDocument();
        expect(screen.getByLabelText('Focus')).toBeInTheDocument();
    });

    it('clicking trigger calls onToggle (opens)', () => {
        render(<Controlled />);
        fireEvent.click(screen.getByLabelText('More actions'));
        expect(screen.getByLabelText('Tags')).toBeInTheDocument();
    });

    it('clicking trigger again calls onToggle (closes)', () => {
        render(<Controlled initialOpen={true} />);
        fireEvent.click(screen.getByLabelText('More actions'));
        expect(screen.queryByLabelText('Tags')).not.toBeInTheDocument();
    });

    it('clicking an item calls its onClick and triggers onToggle (closes)', () => {
        const items = makeItems();
        render(<Controlled initialOpen={true} items={items} />);
        fireEvent.click(screen.getByLabelText('Tags'));
        expect(items[0]?.onClick).toHaveBeenCalledTimes(1);
        expect(screen.queryByLabelText('Tags')).not.toBeInTheDocument();
    });

    it('disabled prop disables the trigger button', () => {
        render(<Controlled disabled />);
        expect(screen.getByLabelText('More actions')).toBeDisabled();
    });

    it('trigger has active class when isOpen=true', () => {
        const { container } = render(<Controlled initialOpen={true} />);
        const trigger = screen.getByLabelText('More actions');
        // trigger should have the active CSS class
        expect(trigger.className).toMatch(/triggerActive/);
        // container sanity check
        expect(container).toBeTruthy();
    });

    it('trigger does NOT have active class when isOpen=false', () => {
        render(<Controlled initialOpen={false} />);
        const trigger = screen.getByLabelText('More actions');
        expect(trigger.className).not.toMatch(/triggerActive/);
    });

    it('children render inline when isOpen=true', () => {
        render(
            <Controlled initialOpen={true}>
                <div data-testid="custom-slot">custom</div>
            </Controlled>,
        );
        expect(screen.getByTestId('custom-slot')).toBeInTheDocument();
    });

    it('children NOT in DOM when isOpen=false', () => {
        render(
            <Controlled initialOpen={false}>
                <div data-testid="custom-slot">custom</div>
            </Controlled>,
        );
        expect(screen.queryByTestId('custom-slot')).not.toBeInTheDocument();
    });

    it('item click closes even when onToggle given', () => {
        const onToggle = vi.fn();
        const items = makeItems();
        render(<OverflowMenu items={items} isOpen={true} onToggle={onToggle} />);
        fireEvent.click(screen.getByLabelText('Tags'));
        expect(items[0]?.onClick).toHaveBeenCalledTimes(1);
        expect(onToggle).toHaveBeenCalledTimes(1);
    });
});
