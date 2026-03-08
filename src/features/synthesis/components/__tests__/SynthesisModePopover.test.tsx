import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SynthesisModePopover } from '../SynthesisModePopover';
import { synthesisStrings } from '../../strings/synthesisStrings';

describe('SynthesisModePopover', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();

    function renderPopover() {
        return render(<SynthesisModePopover onSelect={onSelect} onClose={onClose} />);
    }

    test('renders four mode buttons', () => {
        renderPopover();
        expect(screen.getByText(synthesisStrings.modes.summarize)).toBeDefined();
        expect(screen.getByText(synthesisStrings.modes.outline)).toBeDefined();
        expect(screen.getByText(synthesisStrings.modes.narrative)).toBeDefined();
        expect(screen.getByText(synthesisStrings.modes.questions)).toBeDefined();
    });

    test('click Summarize calls onSelect with summarize', () => {
        renderPopover();
        fireEvent.click(screen.getByText(synthesisStrings.modes.summarize));
        expect(onSelect).toHaveBeenCalledWith('summarize');
    });

    test('click Outline calls onSelect with outline', () => {
        renderPopover();
        fireEvent.click(screen.getByText(synthesisStrings.modes.outline));
        expect(onSelect).toHaveBeenCalledWith('outline');
    });

    test('click Narrative calls onSelect with narrative', () => {
        renderPopover();
        fireEvent.click(screen.getByText(synthesisStrings.modes.narrative));
        expect(onSelect).toHaveBeenCalledWith('narrative');
    });

    test('click Find Gaps calls onSelect with questions', () => {
        renderPopover();
        fireEvent.click(screen.getByText(synthesisStrings.modes.questions));
        expect(onSelect).toHaveBeenCalledWith('questions');
    });

    test('each button shows mode description', () => {
        renderPopover();
        expect(screen.getByText(synthesisStrings.modeDescriptions.summarize)).toBeDefined();
        expect(screen.getByText(synthesisStrings.modeDescriptions.outline)).toBeDefined();
        expect(screen.getByText(synthesisStrings.modeDescriptions.narrative)).toBeDefined();
        expect(screen.getByText(synthesisStrings.modeDescriptions.questions)).toBeDefined();
    });

    test('Escape calls onClose', () => {
        renderPopover();
        fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
        expect(onClose).toHaveBeenCalledOnce();
    });

    test('Enter selects focused mode', () => {
        renderPopover();
        fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Enter' });
        expect(onSelect).toHaveBeenCalledWith('summarize');
    });

    test('ArrowDown cycles focus', () => {
        renderPopover();
        const listbox = screen.getByRole('listbox');
        fireEvent.keyDown(listbox, { key: 'ArrowDown' });
        fireEvent.keyDown(listbox, { key: 'Enter' });
        expect(onSelect).toHaveBeenCalledWith('outline');
    });

    test('all button labels from synthesisStrings', () => {
        renderPopover();
        const allLabels = [
            synthesisStrings.modes.summarize,
            synthesisStrings.modes.outline,
            synthesisStrings.modes.narrative,
            synthesisStrings.modes.questions,
        ];
        allLabels.forEach((label) => {
            expect(screen.getByText(label)).toBeDefined();
        });
    });
});
