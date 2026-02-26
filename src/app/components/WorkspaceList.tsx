import { strings } from '@/shared/localization/strings';
import { WorkspaceItem } from './WorkspaceItem';
import type { Workspace } from '@/features/workspace/types/workspace';
import styles from '@/shared/components/Sidebar.module.css';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

interface WorkspaceListProps {
    workspaces: Workspace[];
    currentWorkspaceId: string | null;
    onSelectWorkspace: (id: string) => void;
    onRenameWorkspace: (id: string, newName: string) => void;
    onReorderWorkspace?: (sourceIndex: number, destinationIndex: number) => void;
    onDeleteWorkspace?: (id: string) => void;
}

export function WorkspaceList({
    workspaces,
    currentWorkspaceId,
    onSelectWorkspace,
    onRenameWorkspace,
    onReorderWorkspace,
    onDeleteWorkspace,
}: WorkspaceListProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Requires 5px movement before dragging starts
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = workspaces.findIndex((ws) => ws.id === active.id);
            const newIndex = workspaces.findIndex((ws) => ws.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1 && onReorderWorkspace) {
                onReorderWorkspace(oldIndex, newIndex);
            }
        }
    };

    if (workspaces.length === 0) {
        return (
            <div className={styles.workspaceList}>
                <div className={styles.workspaceItem}>
                    <span className={styles.workspaceName}>
                        {strings.workspace.untitled}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
        >
            <SortableContext
                items={workspaces.map((ws) => ws.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className={styles.workspaceList} role="list">
                    {workspaces.map((ws) => (
                        <WorkspaceItem
                            key={ws.id}
                            id={ws.id}
                            name={ws.name}
                            type={ws.type}
                            isActive={ws.id === currentWorkspaceId}
                            nodeCount={ws.nodeCount}
                            onSelect={onSelectWorkspace}
                            onRename={onRenameWorkspace}
                            onDelete={onDeleteWorkspace}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
