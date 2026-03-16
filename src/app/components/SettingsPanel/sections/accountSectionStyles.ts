/**
 * AccountSection + AboutSection Tailwind classes and style objects.
 * Consumed by: AccountSection.tsx, AboutSection.tsx
 */
import type { CSSProperties } from 'react';

/* ─── Account info ─── */
export const ACCT_INFO = 'flex items-center';
export const ACCT_INFO_STYLE: CSSProperties = { gap: 'var(--space-md)' };

export const ACCT_AVATAR = 'w-12 h-12 rounded-full object-cover';

export const ACCT_AVATAR_PLACEHOLDER =
    'w-12 h-12 rounded-full flex items-center justify-center font-[var(--font-weight-semibold)] text-[length:var(--font-size-lg)]';
export const ACCT_AVATAR_PLACEHOLDER_STYLE: CSSProperties = {
    background: 'var(--color-primary)',
    color: 'var(--color-text-on-primary)',
};

export const ACCT_DETAILS = 'flex flex-col';
export const ACCT_DETAILS_STYLE: CSSProperties = { gap: 2 };

export const ACCT_NAME = 'font-[var(--font-weight-medium)]';
export const ACCT_NAME_STYLE: CSSProperties = { color: 'var(--color-text-primary)' };

export const ACCT_EMAIL = 'text-[length:var(--font-size-sm)]';
export const ACCT_EMAIL_STYLE: CSSProperties = { color: 'var(--color-text-secondary)' };

/* ─── Action button (Sign out / Export) ─── */
export const ACCT_ACTION_BTN =
    'w-fit rounded-[var(--radius-md)] text-[length:var(--font-size-sm)] cursor-pointer transition-all duration-[var(--transition-fast)]';
export const ACCT_ACTION_BTN_STYLE: CSSProperties = {
    marginTop: 'var(--space-md)',
    padding: 'var(--space-sm) var(--space-md)',
    background: 'transparent',
    color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border)',
};

/* ─── Danger zone ─── */
export const ACCT_DANGER_TITLE = 'border-t border-[var(--color-error)]';
export const ACCT_DANGER_TITLE_STYLE: CSSProperties = {
    color: 'var(--color-error)',
    paddingTop: 'var(--space-lg)',
    marginTop: 'var(--space-sm)',
};

export const ACCT_DANGER_BTN =
    'w-fit rounded-[var(--radius-md)] text-[length:var(--font-size-sm)] cursor-pointer transition-all duration-[var(--transition-fast)]';
export const ACCT_DANGER_BTN_STYLE: CSSProperties = {
    padding: 'var(--space-sm) var(--space-md)',
    background: 'transparent',
    color: 'var(--color-error)',
    border: '1px solid var(--color-error)',
};

/* ─── About section ─── */
export const ABOUT_ROW = 'flex justify-between items-center';
export const ABOUT_ROW_STYLE: CSSProperties = { padding: 'var(--space-sm) 0' };

export const ABOUT_LABEL = 'text-[length:var(--font-size-sm)]';
export const ABOUT_LABEL_STYLE: CSSProperties = { color: 'var(--color-text-secondary)' };

export const ABOUT_VALUE = 'text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)]';
export const ABOUT_VALUE_STYLE: CSSProperties = { color: 'var(--color-text-primary)' };

export const ABOUT_LINKS = 'flex flex-col';
export const ABOUT_LINKS_STYLE: CSSProperties = { gap: 'var(--space-sm)' };

export const ABOUT_LINK =
    'text-[length:var(--font-size-sm)] no-underline transition-colors duration-[var(--transition-fast)] cursor-pointer border-none bg-transparent text-left';
export const ABOUT_LINK_STYLE: CSSProperties = { color: 'var(--color-primary)' };
