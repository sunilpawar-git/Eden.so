/**
 * useNodeCreationGuard — Guards user-initiated node creation against
 * the free tier node-per-workspace limit.
 *
 * Shows a toast with upgrade CTA when the limit is reached.
 * Internal operations (canvas load, undo/redo, onboarding seed) bypass this guard.
 */
import { useCallback } from 'react';
import { useTierLimits } from './useTierLimits';
import { toastWithAction } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';

export function useNodeCreationGuard() {
    const { check } = useTierLimits();

    const guardNodeCreation = useCallback((): boolean => {
        const result = check('node');
        if (!result.allowed) {
            toastWithAction(
                strings.subscription.limits.nodeLimit,
                'warning',
                { label: strings.subscription.upgradeCta, onClick: () => { /* navigate to upgrade */ } },
            );
            return false;
        }
        return true;
    }, [check]);

    return { guardNodeCreation };
}
