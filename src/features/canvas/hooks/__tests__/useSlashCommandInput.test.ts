/**
 * useSlashCommandInput Hook Tests - TDD
 * Tests for slash command detection, prefix-lock, and input mode management
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSlashCommandInput } from '../useSlashCommandInput';

describe('useSlashCommandInput', () => {
    describe('Initial State', () => {
        it('should start with note input mode', () => {
            const { result } = renderHook(() => useSlashCommandInput());
            expect(result.current.inputMode).toBe('note');
        });

        it('should start with menu closed', () => {
            const { result } = renderHook(() => useSlashCommandInput());
            expect(result.current.isMenuOpen).toBe(false);
        });

        it('should start with empty query', () => {
            const { result } = renderHook(() => useSlashCommandInput());
            expect(result.current.query).toBe('');
        });

        it('should start with empty input value', () => {
            const { result } = renderHook(() => useSlashCommandInput());
            expect(result.current.inputValue).toBe('');
        });

        it('should start with no active command', () => {
            const { result } = renderHook(() => useSlashCommandInput());
            expect(result.current.activeCommand).toBeNull();
        });
    });

    describe('Slash Detection', () => {
        it('should open menu when "/" is typed at start', () => {
            const { result } = renderHook(() => useSlashCommandInput());

            act(() => {
                result.current.handleInputChange('/');
            });

            expect(result.current.isMenuOpen).toBe(true);
        });

        it('should capture query after "/"', () => {
            const { result } = renderHook(() => useSlashCommandInput());

            act(() => {
                result.current.handleInputChange('/ai');
            });

            expect(result.current.query).toBe('ai');
        });

        it('should update query as user types more', () => {
            const { result } = renderHook(() => useSlashCommandInput());

            act(() => {
                result.current.handleInputChange('/ai');
            });
            expect(result.current.query).toBe('ai');

            act(() => {
                result.current.handleInputChange('/aig');
            });
            expect(result.current.query).toBe('aig');
        });

        it('should NOT open menu if "/" is not at start', () => {
            const { result } = renderHook(() => useSlashCommandInput());

            act(() => {
                result.current.handleInputChange('hello /');
            });

            expect(result.current.isMenuOpen).toBe(false);
        });
    });

    describe('Prefix Auto-Detection', () => {
        it('should activate command when "/prefix:" is typed', () => {
            const { result } = renderHook(() => useSlashCommandInput());

            act(() => {
                result.current.handleInputChange('/ai:');
            });

            expect(result.current.activeCommand).not.toBeNull();
            expect(result.current.activeCommand?.prefix).toBe('ai');
            expect(result.current.inputMode).toBe('ai');
            expect(result.current.isMenuOpen).toBe(false);
        });

        it('should set inputValue to text after "/prefix:" pattern', () => {
            const { result } = renderHook(() => useSlashCommandInput());

            act(() => {
                result.current.handleInputChange('/ai:hello world');
            });

            expect(result.current.activeCommand).not.toBeNull();
            expect(result.current.inputValue).toBe('hello world');
        });

        it('should set empty inputValue when only "/prefix:" is typed', () => {
            const { result } = renderHook(() => useSlashCommandInput());

            act(() => {
                result.current.handleInputChange('/ai:');
            });

            expect(result.current.inputValue).toBe('');
        });

        it('should NOT activate for unknown prefix', () => {
            const { result } = renderHook(() => useSlashCommandInput());

            act(() => {
                result.current.handleInputChange('/xyz:');
            });

            expect(result.current.activeCommand).toBeNull();
            expect(result.current.inputMode).toBe('note');
            // Still in menu mode since it starts with /
            expect(result.current.isMenuOpen).toBe(true);
        });

        it('should be case insensitive for prefix', () => {
            const { result } = renderHook(() => useSlashCommandInput());

            act(() => {
                result.current.handleInputChange('/AI:prompt');
            });

            expect(result.current.activeCommand).not.toBeNull();
            expect(result.current.inputValue).toBe('prompt');
        });
    });

    describe('Command Selection', () => {
        it('should switch to AI mode when ai-generate is selected', () => {
            const { result } = renderHook(() => useSlashCommandInput());

            act(() => {
                result.current.handleInputChange('/');
            });

            act(() => {
                result.current.handleCommandSelect('ai-generate');
            });

            expect(result.current.inputMode).toBe('ai');
        });

        it('should set activeCommand when command is selected', () => {
            const { result } = renderHook(() => useSlashCommandInput());

            act(() => {
                result.current.handleInputChange('/');
            });

            act(() => {
                result.current.handleCommandSelect('ai-generate');
            });

            expect(result.current.activeCommand).not.toBeNull();
            expect(result.current.activeCommand?.id).toBe('ai-generate');
        });

        it('should close menu after command selection', () => {
            const { result } = renderHook(() => useSlashCommandInput());

            act(() => {
                result.current.handleInputChange('/');
            });

            act(() => {
                result.current.handleCommandSelect('ai-generate');
            });

            expect(result.current.isMenuOpen).toBe(false);
        });

        it('should clear input value after command selection', () => {
            const { result } = renderHook(() => useSlashCommandInput());

            act(() => {
                result.current.handleInputChange('/ai');
            });

            act(() => {
                result.current.handleCommandSelect('ai-generate');
            });

            expect(result.current.inputValue).toBe('');
        });

        it('should clear query after command selection', () => {
            const { result } = renderHook(() => useSlashCommandInput());

            act(() => {
                result.current.handleInputChange('/ai');
            });

            act(() => {
                result.current.handleCommandSelect('ai-generate');
            });

            expect(result.current.query).toBe('');
        });
    });

    describe('Close Menu', () => {
        it('should close menu and clear query on closeMenu', () => {
            const { result } = renderHook(() => useSlashCommandInput());

            act(() => {
                result.current.handleInputChange('/ai');
            });

            act(() => {
                result.current.closeMenu();
            });

            expect(result.current.isMenuOpen).toBe(false);
            expect(result.current.query).toBe('');
        });

        it('should preserve input value on closeMenu', () => {
            const { result } = renderHook(() => useSlashCommandInput());

            act(() => {
                result.current.handleInputChange('/ai');
            });

            act(() => {
                result.current.closeMenu();
            });

            // Input value should be preserved (user might want to keep typing)
            expect(result.current.inputValue).toBe('/ai');
        });
    });

    describe('Reset', () => {
        it('should reset to initial state', () => {
            const { result } = renderHook(() => useSlashCommandInput());

            // Set up some state
            act(() => {
                result.current.handleInputChange('/ai');
            });
            act(() => {
                result.current.handleCommandSelect('ai-generate');
            });
            act(() => {
                result.current.handleInputChange('my prompt');
            });

            // Reset
            act(() => {
                result.current.reset();
            });

            expect(result.current.inputMode).toBe('note');
            expect(result.current.isMenuOpen).toBe(false);
            expect(result.current.query).toBe('');
            expect(result.current.inputValue).toBe('');
            expect(result.current.activeCommand).toBeNull();
        });
    });

    describe('AI Mode Input (Prefix-Lock)', () => {
        it('should keep AI mode when typing in AI mode', () => {
            const { result } = renderHook(() => useSlashCommandInput());

            // Enter AI mode
            act(() => {
                result.current.handleInputChange('/');
                result.current.handleCommandSelect('ai-generate');
            });

            // Type prompt in AI mode
            act(() => {
                result.current.handleInputChange('Write a poem');
            });

            expect(result.current.inputMode).toBe('ai');
            expect(result.current.inputValue).toBe('Write a poem');
        });

        it('should NOT open menu when "/" typed in AI mode', () => {
            const { result } = renderHook(() => useSlashCommandInput());

            // Enter AI mode
            act(() => {
                result.current.handleInputChange('/');
                result.current.handleCommandSelect('ai-generate');
            });

            // Type "/" in AI mode (part of prompt)
            act(() => {
                result.current.handleInputChange('/etc/config');
            });

            expect(result.current.isMenuOpen).toBe(false);
            expect(result.current.inputMode).toBe('ai');
        });

        it('should keep activeCommand while typing in prefix-lock mode', () => {
            const { result } = renderHook(() => useSlashCommandInput());

            act(() => {
                result.current.handleCommandSelect('ai-generate');
            });

            act(() => {
                result.current.handleInputChange('some prompt text');
            });

            expect(result.current.activeCommand?.id).toBe('ai-generate');
            expect(result.current.inputValue).toBe('some prompt text');
        });

        it('should deactivate command when input cleared via backspace', () => {
            const { result } = renderHook(() => useSlashCommandInput());

            // Enter AI mode
            act(() => {
                result.current.handleCommandSelect('ai-generate');
            });

            // Clear input (simulating backspace past prefix)
            act(() => {
                result.current.handleDeactivateCommand();
            });

            expect(result.current.activeCommand).toBeNull();
            expect(result.current.inputMode).toBe('note');
            expect(result.current.inputValue).toBe('');
        });
    });
});
