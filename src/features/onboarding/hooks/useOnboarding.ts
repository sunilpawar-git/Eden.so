/**
 * useOnboarding — state machine hook for the two-stage onboarding flow.
 * Uses useReducer with lazy localStorage init. No Zustand store.
 */
import { useReducer, useEffect, useCallback } from 'react';
import {
    ONBOARDING_STEPS,
    STORAGE_KEY,
    WELCOME_STORAGE_KEY,
    type OnboardingState,
    type OnboardingAction,
} from '../types/onboarding';

export function onboardingReducer(
    state: OnboardingState,
    action: OnboardingAction,
): OnboardingState {
    switch (action.type) {
        case 'START':
            // Welcome still visible — it gates coach marks; wait for DISMISS_WELCOME
            if (state.isCompleted || state.showWelcome) return state;
            return { ...state, stepIndex: 0 };

        case 'DISMISS_WELCOME':
            if (!state.showWelcome) return state;
            return {
                showWelcome: false,
                stepIndex:   state.isCompleted ? null : 0,
                isCompleted: state.isCompleted,
            };

        case 'NEXT': {
            if (state.stepIndex === null) return state;
            const isLast = state.stepIndex >= ONBOARDING_STEPS.length - 1;
            return isLast
                ? { ...state, stepIndex: null, isCompleted: true }
                : { ...state, stepIndex: state.stepIndex + 1 };
        }

        case 'SKIP':
            return { ...state, stepIndex: null, isCompleted: true };

        case 'REPLAY':
            // Skip welcome (already seen); go straight to step 1
            return { showWelcome: false, stepIndex: 0, isCompleted: false };

        default:
            return state;
    }
}

export function useOnboarding() {
    const [state, dispatch] = useReducer(
        onboardingReducer,
        undefined,
        (): OnboardingState => ({
            showWelcome: localStorage.getItem(WELCOME_STORAGE_KEY) !== 'true',
            stepIndex:   null,
            isCompleted: localStorage.getItem(STORAGE_KEY) === 'true',
        }),
    );

    // Sync showWelcome=false → localStorage (write-once key)
    useEffect(() => {
        if (!state.showWelcome) localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
    }, [state.showWelcome]);

    // Sync isCompleted → localStorage (removed on replay)
    useEffect(() => {
        if (state.isCompleted) localStorage.setItem(STORAGE_KEY, 'true');
        else localStorage.removeItem(STORAGE_KEY);
    }, [state.isCompleted]);

    const start          = useCallback(() => dispatch({ type: 'START' }),           []);
    const dismissWelcome = useCallback(() => dispatch({ type: 'DISMISS_WELCOME' }), []);
    const next           = useCallback(() => dispatch({ type: 'NEXT' }),            []);
    const skip           = useCallback(() => dispatch({ type: 'SKIP' }),            []);
    const replay         = useCallback(() => dispatch({ type: 'REPLAY' }),          []);

    return {
        showWelcome:  state.showWelcome,
        activeStep:   state.stepIndex !== null ? (ONBOARDING_STEPS[state.stepIndex] ?? null) : null,
        stepIndex:    state.stepIndex,
        totalSteps:   ONBOARDING_STEPS.length,
        isCompleted:  state.isCompleted,
        start, dismissWelcome, next, skip, replay,
    };
}
