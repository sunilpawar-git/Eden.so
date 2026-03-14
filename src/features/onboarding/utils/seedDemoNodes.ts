/**
 * seedDemoNodes — creates two connected demo nodes on first run.
 * Uses direct store access (bypasses undo history).
 * No-op if either demo node already exists (replay-safe).
 */
import { createIdeaNode } from '@/features/canvas/types/node';
import { createEdge } from '@/features/canvas/types/edge';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { DEMO_NODE_1_ID, DEMO_NODE_2_ID } from '../types/onboarding';
import { onboardingStrings } from '../strings/onboardingStrings';
import type { CanvasNode } from '@/features/canvas/types/node';

const DEMO_EDGE_ID = 'onboarding-edge-1';

// Position nodes side-by-side with natural gap (node width=280, gap=80)
const NODE_1_POSITION = { x: 200, y: 200 };
const NODE_2_POSITION = { x: 560, y: 200 };

function withHeading(node: CanvasNode, heading: string): CanvasNode {
    return { ...node, data: { ...node.data, heading } };
}

/**
 * Seeds two connected demo nodes into the canvas store.
 * Safe to call multiple times — idempotent.
 */
export function seedDemoNodes(workspaceId: string): void {
    const store = useCanvasStore.getState();

    // Idempotency guard — do nothing if already seeded
    if (store.nodes.some((n) => n.id === DEMO_NODE_1_ID)) return;

    const node1 = withHeading(
        createIdeaNode(DEMO_NODE_1_ID, workspaceId, NODE_1_POSITION),
        onboardingStrings.demoNode1Heading,
    );
    const node2 = withHeading(
        createIdeaNode(DEMO_NODE_2_ID, workspaceId, NODE_2_POSITION),
        onboardingStrings.demoNode2Heading,
    );
    const edge = createEdge(DEMO_EDGE_ID, workspaceId, DEMO_NODE_1_ID, DEMO_NODE_2_ID);

    store.addNode(node1);
    store.addNode(node2);
    store.addEdge(edge);
}
