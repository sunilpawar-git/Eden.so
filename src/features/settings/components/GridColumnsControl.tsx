/**
 * GridColumnsControl — Segmented control for selecting masonry grid column count.
 * Renders: Auto | 2 | 3 | 4 | 5 | 6
 * Tailwind-only styling (no .module.css).
 */
import React, { useCallback } from 'react';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import type { GridColumnsPreference } from '@/features/canvas/services/gridColumnsResolver';
import { VALID_GRID_COLUMNS } from '@/features/canvas/services/gridColumnsResolver';
import { strings } from '@/shared/localization/strings';

const OPTIONS: ReadonlyArray<{ value: GridColumnsPreference; label: string }> =
    VALID_GRID_COLUMNS.map((v) => ({
        value: v,
        label: v === 'auto' ? strings.settings.gridColumnsAuto : String(v),
    }));

export const GridColumnsControl = React.memo(function GridColumnsControl() {
    const gridColumns = useSettingsStore((s) => s.gridColumns);

    const handleChange = useCallback((value: GridColumnsPreference) => {
        useSettingsStore.getState().setGridColumns(value);
    }, []);

    return (
        <div>
            <label
                className="block text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-text-secondary)] mb-2"
            >
                {strings.settings.gridColumnsLabel}
            </label>
            <div
                className="inline-flex rounded-[var(--radius-md)] overflow-hidden border border-[var(--color-border)]"
                role="radiogroup"
                aria-label={strings.settings.gridColumnsLabel}
            >
                {OPTIONS.map((option) => {
                    const isActive = option.value === gridColumns;
                    return (
                        <button
                            key={String(option.value)}
                            type="button"
                            role="radio"
                            aria-checked={isActive}
                            onClick={() => handleChange(option.value)}
                            className={`
                                px-3 py-1.5 text-[length:var(--font-size-sm)] cursor-pointer
                                border-none outline-none transition-colors duration-150
                                ${isActive
                                    ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)] font-[var(--font-weight-semibold)]'
                                    : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
                                }
                            `.trim()}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
});
