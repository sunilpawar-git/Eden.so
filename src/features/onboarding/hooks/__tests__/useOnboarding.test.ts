import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { onboardingReducer, useOnboarding } from '../useOnboarding';
import { STORAGE_KEY, WELCOME_STORAGE_KEY } from '../../types/onboarding';
import type { OnboardingState } from '../../types/onboarding';

// ── Pure reducer tests ─────────────────────────────────────────────────────────

const FRESH: OnboardingState = { showWelcome: false, stepIndex: null, isCompleted: false };

describe('onboardingReducer', () => {
    it('START → stepIndex=0 when showWelcome=false, isCompleted=false', () => {
        expect(onboardingReducer(FRESH, { type: 'START' })).toMatchObject({ stepIndex: 0 });
    });

    it('START → no-op when showWelcome=true (welcome gates coach marks)', () => {
        const s: OnboardingState = { showWelcome: true, stepIndex: null, isCompleted: false };
        expect(onboardingReducer(s, { type: 'START' })).toBe(s);
    });

    it('START → no-op when isCompleted=true', () => {
        const s: OnboardingState = { showWelcome: false, stepIndex: null, isCompleted: true };
        expect(onboardingReducer(s, { type: 'START' })).toBe(s);
    });

    it('DISMISS_WELCOME → showWelcome=false, stepIndex=0 when not completed', () => {
        const s: OnboardingState = { showWelcome: true, stepIndex: null, isCompleted: false };
        expect(onboardingReducer(s, { type: 'DISMISS_WELCOME' })).toMatchObject({
            showWelcome: false, stepIndex: 0, isCompleted: false,
        });
    });

    it('DISMISS_WELCOME → stepIndex=null when already completed', () => {
        const s: OnboardingState = { showWelcome: true, stepIndex: null, isCompleted: true };
        expect(onboardingReducer(s, { type: 'DISMISS_WELCOME' })).toMatchObject({
            showWelcome: false, stepIndex: null, isCompleted: true,
        });
    });

    it('DISMISS_WELCOME → no-op when showWelcome already false', () => {
        expect(onboardingReducer(FRESH, { type: 'DISMISS_WELCOME' })).toBe(FRESH);
    });

    it('NEXT → increments stepIndex', () => {
        const s: OnboardingState = { showWelcome: false, stepIndex: 0, isCompleted: false };
        expect(onboardingReducer(s, { type: 'NEXT' })).toMatchObject({ stepIndex: 1 });
    });

    it('NEXT on last step → isCompleted=true, stepIndex=null', () => {
        const s: OnboardingState = { showWelcome: false, stepIndex: 2, isCompleted: false };
        expect(onboardingReducer(s, { type: 'NEXT' })).toMatchObject({
            isCompleted: true, stepIndex: null,
        });
    });

    it('SKIP → isCompleted=true, stepIndex=null', () => {
        const s: OnboardingState = { showWelcome: false, stepIndex: 1, isCompleted: false };
        expect(onboardingReducer(s, { type: 'SKIP' })).toMatchObject({
            isCompleted: true, stepIndex: null,
        });
    });

    it('REPLAY → showWelcome=false, stepIndex=0, isCompleted=false', () => {
        const s: OnboardingState = { showWelcome: false, stepIndex: null, isCompleted: true };
        expect(onboardingReducer(s, { type: 'REPLAY' })).toEqual({
            showWelcome: false, stepIndex: 0, isCompleted: false,
        });
    });
});

// ── Hook integration tests ─────────────────────────────────────────────────────

describe('useOnboarding', () => {
    beforeEach(() => localStorage.clear());

    it('lazy init: showWelcome=true when welcome_shown absent', () => {
        const { result } = renderHook(() => useOnboarding());
        expect(result.current.showWelcome).toBe(true);
    });

    it('lazy init: showWelcome=false when welcome_shown="true"', () => {
        localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
        const { result } = renderHook(() => useOnboarding());
        expect(result.current.showWelcome).toBe(false);
    });

    it('useEffect: welcome_shown written to localStorage when showWelcome→false', async () => {
        const { result } = renderHook(() => useOnboarding());
        act(() => { result.current.dismissWelcome(); });
        expect(localStorage.getItem(WELCOME_STORAGE_KEY)).toBe('true');
    });

    it('useEffect: onboarding_completed written when isCompleted→true', () => {
        localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
        const { result } = renderHook(() => useOnboarding());
        act(() => { result.current.start(); });
        act(() => { result.current.skip(); });
        expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    });

    it('useEffect: onboarding_completed removed when isCompleted→false after REPLAY', () => {
        localStorage.setItem(STORAGE_KEY, 'true');
        localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
        const { result } = renderHook(() => useOnboarding());
        act(() => { result.current.replay(); });
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
});
