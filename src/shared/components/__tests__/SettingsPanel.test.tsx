/**
 * Settings Panel Tests - TDD: Write tests FIRST
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel } from '../SettingsPanel';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { strings } from '@/shared/localization/strings';

// Mock the settings store
vi.mock('@/shared/stores/settingsStore', () => ({
    useSettingsStore: vi.fn(),
}));

describe('SettingsPanel', () => {
    const mockSetTheme = vi.fn();
    const mockToggleCanvasGrid = vi.fn();
    const mockSetAutoSave = vi.fn();
    const mockToggleCompactMode = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useSettingsStore).mockImplementation((selector) => {
            const state = {
                theme: 'system' as const,
                canvasGrid: true,
                autoSave: true,
                autoSaveInterval: 30,
                compactMode: false,
                canvasScrollMode: 'zoom' as const,
                setTheme: mockSetTheme,
                toggleCanvasGrid: mockToggleCanvasGrid,
                setAutoSave: mockSetAutoSave,
                setAutoSaveInterval: vi.fn(),
                toggleCompactMode: mockToggleCompactMode,
                setCanvasScrollMode: vi.fn(),
                getResolvedTheme: () => 'light' as const,
                loadFromStorage: vi.fn(),
            };
            return typeof selector === 'function' ? selector(state) : state;
        });
    });

    describe('visibility', () => {
        it('should render when isOpen is true', () => {
            render(<SettingsPanel isOpen={true} onClose={vi.fn()} />);
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        it('should not render when isOpen is false', () => {
            render(<SettingsPanel isOpen={false} onClose={vi.fn()} />);
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });

    describe('close behavior', () => {
        it('should call onClose when backdrop is clicked', () => {
            const mockOnClose = vi.fn();
            render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
            
            const backdrop = screen.getByTestId('settings-backdrop');
            fireEvent.click(backdrop);
            
            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });

        it('should call onClose when Escape is pressed', () => {
            const mockOnClose = vi.fn();
            render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
            
            fireEvent.keyDown(document, { key: 'Escape' });
            
            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });

        it('should call onClose when close button is clicked', () => {
            const mockOnClose = vi.fn();
            render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
            
            const closeButton = screen.getByLabelText(strings.settings.close);
            fireEvent.click(closeButton);
            
            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('tab navigation', () => {
        it('should display all tab options', () => {
            render(<SettingsPanel isOpen={true} onClose={vi.fn()} />);
            
            expect(screen.getByText(strings.settings.appearance)).toBeInTheDocument();
            expect(screen.getByText(strings.settings.canvas)).toBeInTheDocument();
            expect(screen.getByText(strings.settings.account)).toBeInTheDocument();
            expect(screen.getByText(strings.settings.keyboard)).toBeInTheDocument();
        });

        it('should show Appearance section by default', () => {
            render(<SettingsPanel isOpen={true} onClose={vi.fn()} />);
            
            expect(screen.getByText(strings.settings.theme)).toBeInTheDocument();
        });

        it('should switch to Canvas section when clicked', () => {
            render(<SettingsPanel isOpen={true} onClose={vi.fn()} />);
            
            fireEvent.click(screen.getByText(strings.settings.canvas));
            
            // Canvas section has multiple "Show grid" elements (title + label)
            expect(screen.getAllByText(strings.settings.canvasGrid).length).toBeGreaterThan(0);
        });
    });

    describe('theme selection', () => {
        it('should display all six theme swatches', () => {
            render(<SettingsPanel isOpen={true} onClose={vi.fn()} />);

            expect(screen.getByLabelText(strings.settings.themeLight)).toBeInTheDocument();
            expect(screen.getByLabelText(strings.settings.themeDark)).toBeInTheDocument();
            expect(screen.getByLabelText(strings.settings.themeSystem)).toBeInTheDocument();
            expect(screen.getByLabelText(strings.settings.themeSepia)).toBeInTheDocument();
            expect(screen.getByLabelText(strings.settings.themeGrey)).toBeInTheDocument();
            expect(screen.getByLabelText(strings.settings.themeDarkBlack)).toBeInTheDocument();
        });

        it('should mark the active theme swatch', () => {
            render(<SettingsPanel isOpen={true} onClose={vi.fn()} />);

            const systemOption = screen.getByLabelText(strings.settings.themeSystem);
            expect(systemOption).toBeChecked();
        });

        it('should call setTheme when a theme swatch is selected', () => {
            render(<SettingsPanel isOpen={true} onClose={vi.fn()} />);
            
            const darkOption = screen.getByLabelText(strings.settings.themeDark);
            fireEvent.click(darkOption);
            expect(mockSetTheme).toHaveBeenCalledWith('dark');
        });

        it('should call setTheme with sepia when sepia swatch is selected', () => {
            render(<SettingsPanel isOpen={true} onClose={vi.fn()} />);

            const sepiaOption = screen.getByLabelText(strings.settings.themeSepia);
            fireEvent.click(sepiaOption);
            expect(mockSetTheme).toHaveBeenCalledWith('sepia');
        });

        it('should call setTheme with grey when grey swatch is selected', () => {
            render(<SettingsPanel isOpen={true} onClose={vi.fn()} />);

            const greyOption = screen.getByLabelText(strings.settings.themeGrey);
            fireEvent.click(greyOption);
            expect(mockSetTheme).toHaveBeenCalledWith('grey');
        });

        it('should call setTheme with darkBlack when dark black swatch is selected', () => {
            render(<SettingsPanel isOpen={true} onClose={vi.fn()} />);

            const darkBlackOption = screen.getByLabelText(strings.settings.themeDarkBlack);
            fireEvent.click(darkBlackOption);
            expect(mockSetTheme).toHaveBeenCalledWith('darkBlack');
        });
    });
});
