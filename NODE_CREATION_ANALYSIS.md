# Node Creation Flow Analysis

## Current Implementation

### 1. Node Creation via (+) Button

**File:** `src/features/canvas/components/AddNodeButton.tsx`

**Flow:**
```typescript
handleAddNode() 
  → Creates PromptNode at viewport center
  → Calls canvasStore.addNode(newNode)
```

**Result:** A new empty `PromptNode` (callout box) is created.

---

### 2. Prompt Input & AI Generation

**File:** `src/features/canvas/components/nodes/PromptNode.tsx`

**Flow:**
```typescript
User types prompt → Presses Enter
  → handleKeyDown() calls generateFromPrompt(id)
  → Updates node content with prompt text
```

**File:** `src/features/ai/hooks/useNodeGeneration.ts` (lines 23-73)

**Flow:**
```typescript
generateFromPrompt(promptNodeId)
  → Fetches prompt node content
  → Calls AI service (generateContentWithContext)
  → Creates NEW AIOutputNode (separate callout box) ❌
  → Adds new node to canvas
  → Creates edge connecting prompt → output
```

**Result:** 
- **Prompt Node:** Contains user's prompt text
- **AI Output Node:** Contains AI-generated result (separate callout box)
- **Edge:** Connects the two nodes

---

## Issue Identified

**Problem:** The prompt and its AI result are created in **separate nodes** (callout boxes), when they should be in the **same node**.

**Current Behavior:**
```
┌─────────────────┐
│  User Prompt    │  ← PromptNode
└────────┬────────┘
         │ (edge)
         ▼
┌─────────────────┐
│  AI Result      │  ← AIOutputNode (NEW)
└─────────────────┘
```

**Expected Behavior:**
```
┌─────────────────┐
│  User Prompt    │
│  ─────────────  │
│  AI Result      │  ← Same node, both prompt & result
└─────────────────┘
```

---

## Root Cause

**Location:** `src/features/ai/hooks/useNodeGeneration.ts:46-56`

```typescript
// ❌ CURRENT: Creates a NEW node
const newNode = createAIOutputNode(
    `ai-${Date.now()}`,
    promptNode.workspaceId,
    { x: promptNode.position.x, y: promptNode.position.y + AI_NODE_OFFSET_Y },
    content
);
addNode(newNode);  // Adds separate node
```

**Issue:** Instead of updating the existing `PromptNode` with the result, it creates a new `AIOutputNode`.

---

## Required Changes

### 1. Update Node Data Structure

**File:** `src/features/canvas/types/node.ts`

**Current:**
```typescript
export interface NodeData {
    content: string;  // Only one content field
    isGenerating?: boolean;
}
```

**Needed:**
```typescript
export interface NodeData {
    prompt?: string;      // User's prompt input
    result?: string;      // AI-generated result
    content?: string;     // Keep for backward compatibility
    isGenerating?: boolean;
}
```

### 2. Modify Generation Logic

**File:** `src/features/ai/hooks/useNodeGeneration.ts`

**Change:** Instead of creating a new node, update the existing prompt node:

```typescript
// ✅ NEW: Update existing node with result
useCanvasStore.getState().updateNodeData(promptNodeId, {
    prompt: promptNode.data.content,
    result: content
});
```

### 3. Update PromptNode Component

**File:** `src/features/canvas/components/nodes/PromptNode.tsx`

**Change:** Display both prompt and result in the same node:

```typescript
// Show prompt section
{data.prompt && (
    <div className={styles.promptSection}>
        {data.prompt}
    </div>
)}

// Show divider if result exists
{data.result && <hr className={styles.divider} />}

// Show result section
{data.result && (
    <div className={styles.resultSection}>
        {data.result}
    </div>
)}
```

### 4. Add Store Method

**File:** `src/features/canvas/stores/canvasStore.ts`

**Add:**
```typescript
updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
```

---

## Benefits of This Change

1. **Cleaner UX:** Prompt and result in one cohesive callout box
2. **Less Clutter:** Fewer nodes on canvas
3. **Better Context:** Clear relationship between prompt and result
4. **Simpler Mental Model:** One node = one complete interaction

---

## Edge Handling

**Current:** When a prompt generates a result, an edge is created:
```typescript
// Line 60-66 in useNodeGeneration.ts
useCanvasStore.getState().addEdge({
    sourceNodeId: promptNodeId,
    targetNodeId: newNode.id,  // Points to separate output node
    relationshipType: 'derived',
});
```

**After Fix:** No edge needed when prompt and result are in the same node. However, edges are still useful for:
- Connecting one node's result to another node's prompt (cross-node relationships)
- Building dependency chains between different nodes

**Action:** Remove edge creation in `generateFromPrompt()` since it's the same node.

---

## Migration Considerations

- Existing nodes with `content` field should still work
- Need to handle backward compatibility
- Edge creation logic needs adjustment: **Remove edge creation** in `generateFromPrompt()` (lines 60-66)
- Edges between different nodes (for synthesis/chaining) should remain unchanged
