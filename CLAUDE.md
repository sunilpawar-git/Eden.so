# ActionStation - Project Rules

> **CRITICAL**: ZERO TECH DEBT policy. All rules are NON-NEGOTIABLE.

## 🚨 STRICT LIMITS

| Rule | Limit | Action |
|------|-------|--------|
| File Size | MAX 300 lines | Split immediately |
| Component | MAX 100 lines | Extract sub-components |
| Function | MAX 50 lines | Extract helpers |
| Hook | MAX 75 lines | Split by responsibility |

## 🏗️ ARCHITECTURE (MVVM + Feature-First)

```
src/
├── features/              # Feature modules (SSOT per domain)
│   ├── auth/
│   │   ├── types/         # Model: interfaces
│   │   ├── stores/        # ViewModel: Zustand slices
│   │   ├── hooks/         # Bridge: useAuth, useUser
│   │   ├── components/    # View: LoginButton, UserAvatar
│   │   ├── services/      # Side effects: authService
│   │   └── __tests__/     # Co-located tests
│   ├── canvas/
│   ├── ai/
│   └── workspace/
├── shared/
│   ├── components/        # Reusable UI (Button, Toast)
│   ├── hooks/             # Generic hooks (useDebounce)
│   ├── utils/             # Pure functions
│   └── localization/      # String resources
├── config/                # Environment, constants
└── styles/                # CSS variables, global styles
```

### SOLID Principles Enforcement
- **S**: One file = One responsibility
- **O**: Extend via composition, not modification
- **NO HARDCODED STRINGS**: Use `stringResource(R.string.key)` or `context.getString()`.
- **NO HARDCODED COLORS**: Use `MaterialTheme.colorScheme.primary`.
- **NO HARDCODED DIMENSIONS**: Use `dp` or `sp` resources/constants.
- **SECURITY: NO SECRETS IN CODE**: NEVER hardcode API keys, passwords, or tokens. Use `.env.local` for local development. Use environment variables in CI/CD.
- **L**: Interfaces define contracts
- **I**: Small, focused interfaces
- **D**: Depend on abstractions (services via interfaces)

## 🗣️ NO HARDCODING (ZERO TOLERANCE)

```typescript
// ❌ FORBIDDEN
<button>Submit</button>
style={{ color: '#3b82f6' }}

// ✅ REQUIRED
import { strings } from '@/shared/localization/strings';
<button>{strings.common.submit}</button>
className={styles.primaryButton}  // Uses CSS variable
```

## ⚡ PERFORMANCE RULES (ReactFlow 500+ Nodes)

```typescript
// 1. ALWAYS memoize custom nodes
const PromptNode = React.memo(({ data }: NodeProps) => { ... });

// 2. NEVER access nodes/edges directly in render
// ❌ const nodes = useStore(state => state.nodes);
// ✅ const nodeCount = useStore(state => state.nodes.length);

// 3. Decouple selection state
const selectedNodeIds = useStore(state => state.selectedNodeIds);

// 4. Use viewport-only rendering (lazy render)
<ReactFlow onlyRenderVisibleElements={true} />

// 5. Memoize callbacks
const onNodeDrag = useCallback(() => {}, []);
```

## 🔒 SECURITY PROTOCOL

### Firebase Rules Structure
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // DENY ALL by default
    match /{document=**} {
      allow read, write: if false;
    }
    
    // User isolation
    match /users/{userId} {
      allow read, write: if request.auth != null 
                        && request.auth.uid == userId;
      
      match /workspaces/{workspaceId} {
        allow read, write: if request.auth.uid == userId;
        
        match /nodes/{nodeId} {
          allow read, write: if request.auth.uid == userId;
        }
        match /edges/{edgeId} {
          allow read, write: if request.auth.uid == userId;
        }
      }
    }
  }
}
```

### API Key Protection
- `.env.local` for all secrets (NEVER commit)
- Firebase App Check enabled (recaptcha v3)
- Gemini API calls via Cloud Function (hide API key)

### Code Security
- NO `any` types in production
- Input validation on all user content
- XSS prevention: sanitize markdown output
- CORS configured for production domain only

## 🧪 TDD PROTOCOL (STRICT)

```
1. RED:    Write failing test first
2. GREEN:  Minimal code to pass
3. REFACTOR: Clean while green
4. COMMIT: Only when tests pass
```

### Test Coverage Requirements
| Layer | Minimum Coverage |
|-------|-----------------|
| Stores (ViewModel) | 90% |
| Services | 85% |
| Utils | 100% |
| Hooks | 80% |
| Components | 60% (critical paths) |

## 📦 STATE MANAGEMENT (Zustand + TanStack Query)

```typescript
// Zustand: Local/UI state (canvas, selections, UI flags)
// TanStack Query: Server state (user profile, workspace data)

// Store pattern
interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeIds: Set<string>;
  // Actions are in the store
  addNode: (node: Node) => void;
  selectNode: (id: string) => void;
}
```

### 🔴 CRITICAL: Zustand Selector Pattern (Prevents "Maximum Update Depth" Errors)

The **selector pattern is MANDATORY**. Bare store subscriptions cause cascading re-renders and infinite loops in ReactFlow.

```typescript
// ❌ ANTI-PATTERN - Subscribes to ENTIRE store (causes re-renders on ANY field change)
const { user, isLoading, setUser } = useAuthStore();

// ✅ CORRECT - Use selectors for state, getState() for actions
const user = useAuthStore((s) => s.user);
const isLoading = useAuthStore((s) => s.isLoading);

// For actions, use getState() - stable references, no re-render dependency
const handleSubmit = () => useAuthStore.getState().setUser(newUser);
```

**Why This Matters:**
- Bare destructuring subscribes to ENTIRE store object
- ANY field change → component re-renders → useEffect fires → updates store → cascades
- With 500+ nodes in ReactFlow, this causes "Maximum update depth exceeded" errors
- Selectors ensure component only re-renders when SPECIFIC field changes

**All Zustand Stores Require Selectors:**
- `useAuthStore` → `const user = useAuthStore((s) => s.user)`
- `useWorkspaceStore` → `const currentId = useWorkspaceStore((s) => s.currentWorkspaceId)`
- `useCanvasStore` → `const nodes = useCanvasStore((s) => s.nodes)`
- `useToastStore` → `const toasts = useToastStore((s) => s.toasts)`
- `useConfirmStore` → `const isOpen = useConfirmStore((s) => s.isOpen)`
- `useSettingsStore` → `const theme = useSettingsStore((s) => s.theme)`
- `useFocusStore` → `const focusedId = useFocusStore((s) => s.focusedNodeId)`
- `useKnowledgeBankStore` → `const entries = useKnowledgeBankStore((s) => s.entries)`

**Enforcement:** Regression test `src/__tests__/zustandSelectors.structural.test.ts` scans for all 8 anti-patterns and fails the build if any are found.

## ✅ COMMIT CONVENTIONS

Format: `type(scope): description`

| Type | Use |
|------|-----|
| feat | New feature |
| fix | Bug fix |
| refactor | Code change (no feature/fix) |
| test | Adding tests |
| docs | Documentation |
| perf | Performance |
| security | Security fix |

## 🚫 TECH DEBT PREVENTION

Before ANY commit:
1. `npm run lint` → 0 errors
2. `npm run test` → 100% pass
3. `npm run build` → success
4. File audit: `find src -name "*.ts*" | xargs wc -l | awk '$1 > 300'` → empty
5. String audit: No inline strings in components

**NO EXCEPTIONS. NO "TODO: fix later". NO SHORTCUTS.**
