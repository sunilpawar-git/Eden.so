/**
 * Toggle — Accessible pill-style switch with optional description.
 * Single interactive control: a visually hidden checkbox with role="switch".
 * The track/knob are purely visual (aria-hidden).
 */
import React from 'react';
import clsx from 'clsx';

interface ToggleProps {
    checked: boolean;
    onChange: () => void;
    label: string;
    description?: string;
    disabled?: boolean;
    id: string;
}

const TOGGLE_KNOB_SIZE = 16;

export const Toggle = React.memo(function Toggle({ checked, onChange, label, description, disabled = false, id }: ToggleProps) {
    const descriptionId = description ? `${id}-desc` : undefined;

    return (
        <label className="flex items-start justify-between gap-4 cursor-pointer" htmlFor={id}>
            <span className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-[var(--font-size-sm)] text-[var(--color-text-primary)]">{label}</span>
                {description != null && (
                    <span id={descriptionId} className="text-[var(--font-size-xs)] text-[var(--color-text-muted)]">{description}</span>
                )}
            </span>
            <input
                type="checkbox"
                role="switch"
                id={id}
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                aria-checked={checked}
                aria-describedby={descriptionId}
                className="peer sr-only"
            />
            <span
                className={clsx(
                    'relative w-9 h-5 min-w-[36px] rounded-[10px] cursor-pointer p-0 transition-colors duration-150 ease-in-out shrink-0 mt-0.5 peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--color-primary)] peer-focus-visible:outline-offset-2',
                    checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
                aria-hidden="true"
            >
                <span
                    className={clsx(
                        'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[var(--color-text-on-primary)] transition-transform duration-150 ease-in-out',
                        checked && `translate-x-[${String(TOGGLE_KNOB_SIZE)}px]`
                    )}
                />
            </span>
        </label>
    );
});
