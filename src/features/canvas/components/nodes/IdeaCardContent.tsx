/**
 * IdeaCardContent - Extracted content area sub-components
 *
 * NOTE: TipTapEditor is intentionally NOT rendered here — it lives at
 * a stable position in IdeaCardContentSection to prevent TipTap v3's
 * EditorContent unmount/remount from clearing ReactNodeView portals.
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import styles from './IdeaCard.module.css';

export const GeneratingContent = React.memo(() => (
    <div className={styles.generating}>
        <div className={styles.spinner} />
        <span>{strings.canvas.generating}</span>
    </div>
));
