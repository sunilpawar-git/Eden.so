import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useConfirmStore } from '../confirmStore';

describe('confirmStore', () => {
    beforeEach(() => {
        // Reset state between tests
        useConfirmStore.setState({
            isOpen: false,
            options: null,
            resolve: null,
        });
    });

    it('initializes with closed state', () => {
        const { result } = renderHook(() => useConfirmStore());
        expect(result.current.isOpen).toBe(false);
        expect(result.current.options).toBeNull();
    });

    it('opens dialog with provided options and returns a promise', () => {
        const { result } = renderHook(() => useConfirmStore());
        const options = { title: 'Test', message: 'Message' };

        let promise: Promise<boolean> | undefined;
        act(() => {
            promise = result.current.confirm(options);
        });

        expect(result.current.isOpen).toBe(true);
        expect(result.current.options).toEqual(options);
        expect(promise).toBeInstanceOf(Promise);
    });

    it('resolves promise with true when handleConfirm is called', async () => {
        const { result } = renderHook(() => useConfirmStore());

        let promise: Promise<boolean> | undefined;
        act(() => {
            promise = result.current.confirm({ title: 'Test', message: 'Message' });
        });

        act(() => {
            result.current.handleConfirm();
        });

        await expect(promise).resolves.toBe(true);

        // Should close after resolving
        expect(result.current.isOpen).toBe(false);
        expect(result.current.options).toBeNull();
    });

    it('resolves promise with false when handleCancel is called', async () => {
        const { result } = renderHook(() => useConfirmStore());

        let promise: Promise<boolean> | undefined;
        act(() => {
            promise = result.current.confirm({ title: 'Test', message: 'Message' });
        });

        act(() => {
            result.current.handleCancel();
        });

        await expect(promise).resolves.toBe(false);

        // Should close after rejecting
        expect(result.current.isOpen).toBe(false);
        expect(result.current.options).toBeNull();
    });
});
