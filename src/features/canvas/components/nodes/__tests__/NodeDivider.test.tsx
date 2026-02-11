/**
 * NodeDivider Component Tests - TDD: Write tests FIRST
 * Tests divider rendering and accessibility
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NodeDivider } from '../NodeDivider';
import { strings } from '@/shared/localization/strings';

describe('NodeDivider', () => {
    it('renders divider element', () => {
        render(<NodeDivider />);
        expect(screen.getByTestId('node-divider')).toBeInTheDocument();
    });

    it('has correct aria-label from string resources', () => {
        render(<NodeDivider />);
        const divider = screen.getByTestId('node-divider');
        expect(divider.getAttribute('aria-label')).toBe(strings.ideaCard.dividerLabel);
    });

    it('renders as a separator role', () => {
        render(<NodeDivider />);
        expect(screen.getByRole('separator')).toBeInTheDocument();
    });
});
