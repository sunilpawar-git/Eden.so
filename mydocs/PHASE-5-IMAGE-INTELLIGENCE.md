# Phase 5: Image Intelligence (Simplified)

## Problem Statement

Users upload images to nodes (screenshots, diagrams, whiteboard photos) but the AI cannot "see" them. Only text documents trigger the Document Intelligence pipeline. For a knowledge work canvas, this is a significant blind spot — visual artifacts are a core part of how people capture information. A photo of a whiteboard from a meeting, a screenshot of a design mockup, or a chart from a report all contain rich information that the AI should understand and synthesize.

## Intended Solution

Extend the existing document analysis pipeline to handle images. No new UI paradigms — images follow the exact same flow as documents: upload → AI analyzes → insight node spawns. The existing `autoAnalyzeDocuments` toggle and premium gate apply to images too. This is a pipeline extension, not a new feature.

**What we deliberately skip** (vs. original plan):
- No SparkleIcon component (auto-spawn works, same as documents)
- No toolbar toggle duplication (settings toggle is sufficient)
- No "documents" → "attachments" rename (18-file churn for a label change)
- No `hasExtraction` / `insightSpawned` transient TipTap attributes

**Result**: ~5 files changed instead of 18. Same user value.

## Architecture Decision

- **No new feature module** — extends existing `documentAgent` and `canvas` features
- **Reuses entire existing pipeline**: `analyzeAndSpawn` → `analyzeDocument` → `buildInsightSpawn` → atomic canvas update
- **Image → text bridge**: `describeImageWithAI()` produces `parsedText` that feeds into the standard analysis pipeline
- **Security**: Image blobs validated for MIME type before processing; no arbitrary file execution; Gemini Vision API handles image safely

---

## Sub-phase 5A: Fix imageDescriptionService MIME Bug

### What We Build

Fix the hardcoded `'image/jpeg'` MIME type in `imageDescriptionService.ts` to use the actual blob MIME type.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/knowledgeBank/services/imageDescriptionService.ts` | EDIT | 1 line changed |
| `src/features/knowledgeBank/services/__tests__/imageDescriptionService.test.ts` | EDIT | +15 lines |

### Implementation

**Current (buggy)**:
```typescript
mimeType: 'image/jpeg',  // hardcoded — breaks PNG, WebP, GIF
```

**Fixed**:
```typescript
mimeType: blob.type || 'image/jpeg',  // use actual type, fallback for edge cases
```

**Security**: `blob.type` is set by the browser from the file's actual MIME type. The value is passed to Gemini Vision API which validates it. We do NOT use this as a file path or execute it. The fallback `'image/jpeg'` handles edge cases where `blob.type` is empty (e.g., programmatically created blobs).

**MIME validation** — add guard before the API call:

```typescript
const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif'
]);

const mimeType = blob.type || 'image/jpeg';
if (!ALLOWED_IMAGE_MIMES.has(mimeType)) {
  throw new Error(strings.errors.unsupportedImageType);
}
```

### TDD Tests

```
1. PNG blob → mimeType sent as 'image/png'
2. JPEG blob → mimeType sent as 'image/jpeg'
3. WebP blob → mimeType sent as 'image/webp'
4. Empty blob.type → fallback 'image/jpeg'
5. Unsupported MIME type 'image/svg+xml' → throws error
6. Unsupported MIME type 'application/pdf' → throws error (not an image)
```

### Tech Debt Checkpoint

- [ ] File stays under 300 lines
- [ ] MIME whitelist (no arbitrary types)
- [ ] Error message from string resources
- [ ] Zero lint errors

---

## Sub-phase 5B: Extend AttachmentMeta for Images

### What We Build

Allow `AttachmentMeta` to track image attachments alongside documents, enabling the extraction cache to work for images.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/canvas/types/document.ts` | EDIT | +10 lines |
| `src/features/canvas/types/__tests__/document.test.ts` | EDIT | +20 lines |

### Implementation

**Current `document.ts`** — add image MIME types:

```typescript
export const IMAGE_ANALYSIS_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif'
] as const;

export type ImageAnalysisMimeType = typeof IMAGE_ANALYSIS_MIME_TYPES[number];

// Union type for all analyzable attachment MIME types
export type AnalyzableMimeType = DocumentMimeType | ImageAnalysisMimeType;

// Type guard
export function isImageMimeType(mimeType: string): mimeType is ImageAnalysisMimeType {
  return (IMAGE_ANALYSIS_MIME_TYPES as readonly string[]).includes(mimeType);
}

// Extend AttachmentMeta.mimeType to accept image types
// (update the existing type to use AnalyzableMimeType)
```

**AttachmentMeta shape** (existing fields stay, type widens):
```typescript
interface AttachmentMeta {
  filename: string;
  url: string;
  mimeType: AnalyzableMimeType;  // was DocumentMimeType
  parsedText?: string;
  extraction?: ExtractionResult;
  analyzedAt?: Date;
  // ... other existing fields
}
```

**Security**: The `AnalyzableMimeType` is a closed union — only specific whitelisted types are accepted. This prevents arbitrary MIME types from entering the pipeline.

### TDD Tests

```
1. isImageMimeType('image/jpeg') → true
2. isImageMimeType('image/png') → true
3. isImageMimeType('application/pdf') → false
4. isImageMimeType('text/html') → false
5. isImageMimeType('') → false
6. AttachmentMeta accepts 'image/jpeg' as mimeType (type-level test via tsc)
7. AttachmentMeta accepts 'application/pdf' as mimeType (existing types still work)
8. IMAGE_ANALYSIS_MIME_TYPES has exactly 4 entries
```

### Tech Debt Checkpoint

- [ ] File stays under 300 lines (currently 110 + 10 = 120)
- [ ] No `any` types
- [ ] Closed union type (whitelist, not string)
- [ ] Backward compatible (existing DocumentMimeType still works)
- [ ] Zero lint errors

---

## Sub-phase 5C: Wire Image Upload to Analysis Pipeline

### What We Build

After an image is uploaded to a node, create an `AttachmentMeta` for it and trigger the document analysis pipeline.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/canvas/hooks/useIdeaCardImageHandlers.ts` | EDIT | +20 lines |
| `src/features/canvas/services/documentParsingService.ts` | EDIT | +15 lines |
| `src/features/canvas/hooks/__tests__/useIdeaCardImageHandlers.imageAnalysis.test.ts` | NEW | ~90 |
| `src/features/canvas/services/__tests__/documentParsingService.image.test.ts` | NEW | ~50 |

### Implementation

**`documentParsingService.ts`** — add image parsing:

```typescript
export async function parseImageForAnalysis(
  blob: Blob,
  filename: string
): Promise<string> {
  // Validate MIME type
  if (!isImageMimeType(blob.type || 'image/jpeg')) {
    throw new Error(strings.errors.unsupportedImageType);
  }

  // Use existing image description service (Gemini Vision)
  const description = await describeImageWithAI(blob, filename);
  return description;
}
```

**`useIdeaCardImageHandlers.ts`** — extend the post-upload flow:

```typescript
// After successful image insert into TipTap editor:
const handleAfterImageInsert = useCallback(async (
  file: File,
  imageUrl: string
) => {
  // 1. Create AttachmentMeta for the image
  const imageMeta: AttachmentMeta = {
    filename: sanitizeFilename(file.name),
    url: imageUrl,
    mimeType: (file.type || 'image/jpeg') as AnalyzableMimeType,
  };

  // 2. Add to node's attachments (atomic update)
  const currentAttachments = useCanvasStore.getState()
    .nodes.find(n => n.id === nodeId)?.data.attachments ?? [];
  useCanvasStore.getState().updateNodeAttachments(nodeId, [
    ...currentAttachments,
    imageMeta
  ]);

  // 3. Trigger analysis (same pipeline as documents)
  // analyzeAndSpawn checks autoAnalyzeDocuments toggle + premium gate internally
  try {
    const parsedText = await parseImageForAnalysis(file, file.name);
    await analyzeAndSpawn(nodeId, parsedText, file.name, workspaceId);
  } catch {
    // Analysis failure is non-blocking — image is already inserted
    // Error logged internally by analyzeAndSpawn
  }
}, [nodeId, workspaceId, analyzeAndSpawn]);
```

**Key decisions**:
- Image is inserted into TipTap FIRST (instant visual feedback)
- AttachmentMeta created SECOND (enables extraction caching)
- Analysis triggered THIRD (async, non-blocking)
- If analysis fails, the image is still there — graceful degradation
- `sanitizeFilename` used on `file.name` (existing utility — prevents path traversal)

**Security**:
- `file.type` validated by `isImageMimeType` before processing
- `sanitizeFilename` strips path separators and special characters
- Image URL is a Firebase Storage URL (already validated by upload service)
- `analyzeAndSpawn` internally checks premium gate — no bypass

### TDD Tests

**useIdeaCardImageHandlers.imageAnalysis.test.ts**:
```
1. Image upload → AttachmentMeta created with correct mimeType
2. Image upload → parseImageForAnalysis called with file blob
3. Image upload → analyzeAndSpawn called with parsedText from image description
4. autoAnalyzeDocuments=false → analyzeAndSpawn skips analysis (internal check)
5. Non-premium user → analyzeAndSpawn skips analysis (internal check)
6. parseImageForAnalysis fails → image still in editor (non-blocking)
7. analyzeAndSpawn fails → image still in editor (non-blocking)
8. Filename sanitized before passing to services
9. Unsupported MIME type (e.g. SVG) → parseImageForAnalysis throws, image still inserted
10. AttachmentMeta added to existing attachments (doesn't replace them)
```

**documentParsingService.image.test.ts**:
```
1. parseImageForAnalysis('image/png') → calls describeImageWithAI
2. parseImageForAnalysis('image/jpeg') → calls describeImageWithAI
3. parseImageForAnalysis('application/pdf') → throws error
4. parseImageForAnalysis returns description string
5. Gemini Vision error → propagates (caller handles)
```

### Tech Debt Checkpoint

- [ ] useIdeaCardImageHandlers stays under 300 lines (currently 106 + 20 = 126)
- [ ] documentParsingService stays under 300 lines (currently 171 + 15 = 186)
- [ ] No `any` types
- [ ] `sanitizeFilename` on all user-provided filenames
- [ ] Non-blocking error handling (image insertion never fails due to analysis)
- [ ] Single `updateNodeAttachments` call (atomic)
- [ ] No Zustand anti-patterns (all reads via getState() inside callback)
- [ ] Zero lint errors

---

## Sub-phase 5D: Integration Test for Image Analysis Pipeline

### What We Build

End-to-end test verifying the complete image upload → analysis → insight node flow.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/canvas/__tests__/imageAnalysis.integration.test.ts` | NEW | ~100 |
| `src/features/canvas/__tests__/imageAnalysis.structural.test.ts` | NEW | ~40 |

### Integration Test

```typescript
describe('Image Analysis Pipeline — end to end', () => {

  test('image upload with auto-analyze ON → creates insight node', async () => {
    // Setup:
    // - Mock settingsStore: autoAnalyzeDocuments = true
    // - Mock subscription: premium = true
    // - Mock Gemini Vision: returns "A whiteboard showing project timeline..."
    // - Mock analyzeDocument: returns extraction result
    // - Create parent node in canvas store

    // Act:
    // - Simulate image upload (call handleAfterImageInsert with mock file)

    // Assert:
    // 1. AttachmentMeta added to parent node with mimeType 'image/png'
    // 2. parseImageForAnalysis called with file blob
    // 3. analyzeAndSpawn called with image description as parsedText
    // 4. New insight node created in canvas store
    // 5. New edge connects parent → insight node (relationshipType: 'derived')
    // 6. Insight node output contains extraction content
  });

  test('image upload with auto-analyze OFF → no analysis, image still inserted', async () => {
    // Setup: autoAnalyzeDocuments = false
    // Act: simulate image upload
    // Assert:
    // 1. AttachmentMeta added (for future manual analysis)
    // 2. analyzeAndSpawn returns early (checked internally)
    // 3. No insight node created
    // 4. No errors thrown
  });

  test('image upload with non-premium user → no analysis, image still inserted', async () => {
    // Setup: premium = false
    // Act: simulate image upload
    // Assert: same as auto-analyze OFF
  });

  test('Gemini Vision failure → graceful degradation', async () => {
    // Setup: describeImageWithAI throws network error
    // Act: simulate image upload
    // Assert:
    // 1. Image still in editor (TipTap insertion succeeded)
    // 2. AttachmentMeta added (url valid)
    // 3. No insight node created
    // 4. No unhandled promise rejection
  });

  test('image + existing document attachments → both preserved', async () => {
    // Setup: node already has a PDF AttachmentMeta
    // Act: upload image
    // Assert: node.attachments has both PDF and image entries
  });
});
```

### Structural Test

```typescript
describe('Image Analysis structural safety', () => {

  test('imageDescriptionService uses blob.type, not hardcoded MIME', () => {
    // Read file source, verify no 'image/jpeg' without fallback logic
  });

  test('ALLOWED_IMAGE_MIMES whitelist in imageDescriptionService', () => {
    // Verify whitelist exists and contains exactly the allowed types
  });

  test('parseImageForAnalysis validates MIME type', () => {
    // Verify isImageMimeType check before processing
  });

  test('sanitizeFilename used on image filenames', () => {
    // Grep useIdeaCardImageHandlers for sanitizeFilename call
  });

  test('No any types in modified files', () => {
    // Scan all modified/new files
  });

  test('All modified files under 300 lines', () => {
    // wc -l check
  });
});
```

### Tech Debt Checkpoint

- [ ] All tests pass (including existing document analysis tests — no regression)
- [ ] Integration test covers all branches (auto-analyze on/off, premium/free, success/failure)
- [ ] Structural test prevents MIME bug regression
- [ ] Zero lint errors

---

## Sub-phase 5E: String Resources & Final Polish

### What We Build

Add any missing string resources and ensure the image analysis path is fully covered by error messages.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/shared/localization/strings.ts` | EDIT | +2 lines |
| `src/shared/localization/canvasStrings.ts` | EDIT | +3 lines |

### Implementation

**`canvasStrings.ts`** additions:
```typescript
unsupportedImageType: 'Unsupported image format. Use JPEG, PNG, WebP, or GIF.',
imageAnalysisFailed: 'Could not analyze image. The image is still saved.',
imageAnalyzing: 'Analyzing image...',
```

### TDD Tests

```
1. strings.canvas.unsupportedImageType exists and is non-empty
2. strings.canvas.imageAnalysisFailed exists and is non-empty
3. strings.canvas.imageAnalyzing exists and is non-empty
```

### Tech Debt Checkpoint

- [ ] All error messages from string resources
- [ ] No hardcoded strings in modified files (grep audit)
- [ ] Zero lint errors

---

## Build Gate Checklist (Full Phase 5)

```bash
npx tsc --noEmit          # zero errors
npm run lint               # zero errors
npm run test               # ALL pass (including all existing document agent tests)

# File size audit:
wc -l src/features/knowledgeBank/services/imageDescriptionService.ts  # < 300
wc -l src/features/canvas/types/document.ts                           # < 300
wc -l src/features/canvas/hooks/useIdeaCardImageHandlers.ts           # < 300
wc -l src/features/canvas/services/documentParsingService.ts          # < 300

# Security audit:
grep -n "sanitizeFilename" src/features/canvas/hooks/useIdeaCardImageHandlers.ts  # present
grep -n "isImageMimeType" src/features/canvas/services/documentParsingService.ts  # present
grep -n "ALLOWED_IMAGE_MIMES" src/features/knowledgeBank/services/imageDescriptionService.ts  # present

# Zustand audit:
grep -rn "useCanvasStore()" src/features/canvas/hooks/useIdeaCardImageHandlers.ts  # empty (no bare calls)
```

---

## Phase 5 Tech Debt Audit

| Potential Debt | How We Prevented It |
|---------------|-------------------|
| MIME type injection | Closed `AnalyzableMimeType` union + `ALLOWED_IMAGE_MIMES` whitelist |
| Filename path traversal | `sanitizeFilename()` on all user-provided filenames |
| Hardcoded 'image/jpeg' (the original bug) | Structural test explicitly checks for `blob.type` usage |
| Analysis blocking image insertion | Non-blocking try/catch — image always appears regardless of analysis outcome |
| Missing error messages | All error paths use `canvasStrings` string resources |
| Attachment array mutation | Spread operator creates new array → `updateNodeAttachments` is single atomic call |
| Zustand anti-patterns | All store reads inside callbacks use `getState()` |
| Stale closure in callbacks | `useCallback` dependencies are `[nodeId, workspaceId, analyzeAndSpawn]` — all stable refs |
| Regression on document analysis | Existing document tests run unchanged — pipeline extended, not modified |

**Net new files**: 4 (2 test + 2 test)
**Files modified**: 5 (imageDescriptionService, document.ts, useIdeaCardImageHandlers, documentParsingService, canvasStrings)
**Estimated total new lines**: ~370 (mostly tests)
**Estimated modified lines**: ~50 in production code

---

## Summary: Phase 5 vs. Original Plan

| | Original Plan | Simplified Phase 5 |
|---|---|---|
| Files changed | 18 | 5 production + 4 test |
| SparkleIcon component | Yes (new UI paradigm) | No (reuses existing auto-spawn) |
| Toolbar toggle duplication | Yes | No (settings toggle sufficient) |
| "documents" → "attachments" rename | Yes (18 files) | No (label cosmetics ≠ value) |
| Transient TipTap attributes | Yes (hasExtraction, insightSpawned) | No |
| User-facing value | Image analysis + insight spawn | Identical |
| Engineering effort | 3 phases, 55 tasks | 5 sub-phases, ~15 tasks |
| Risk surface | High (TipTap extension changes) | Low (pipeline extension only) |
