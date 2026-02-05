/**
 * Add Node Button - Floating action button to add new nodes
 */
import { strings } from '@/shared/localization/strings';
import { useAddNode } from '../hooks/useAddNode';
import styles from './AddNodeButton.module.css';

export function AddNodeButton() {
    const handleAddNode = useAddNode();

    return (
        <button
            className={styles.addButton}
            onClick={handleAddNode}
            aria-label={strings.canvas.addNode}
            title={strings.canvas.addNode}
        >
            <span className={styles.icon}>+</span>
        </button>
    );
}
