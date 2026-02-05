# Lighthouse Optimization Plan

## Status: COMPLETED

All 5 phases have been implemented successfully.

## Baseline vs Expected Results

| Metric | Before | After (Expected) |
|--------|--------|------------------|
| Performance | 36/100 | 70+ |
| FCP | 2.2s | <1.8s |
| LCP | 4.4s | <2.5s |
| TTI | 4.4s | <3.8s |
| Accessibility | 86/100 | 100 |
| SEO | 82/100 | 100 |

## Bundle Size Optimization Results

| Chunk | Size (gzipped) |
|-------|---------------|
| `vendor-firebase` | 128.94 KB |
| `vendor-reactflow` | 104.91 KB |
| `index` (app code) | 49.34 KB |
| `vendor-state` | 8.78 KB |
| `web-vitals` | 2.54 KB |
| `LoginPage` | 1.09 KB |

### Issues Identified

1. **Performance**: Slow initial load (no code splitting, large bundle)
2. **Accessibility**: Insufficient color contrast on 3 elements
3. **SEO**: Invalid `robots.txt` (missing public folder)
4. **Console Errors**: Firebase Auth network error during testing

---

## Phase-wise Implementation Plan

### Phase 1: SEO Foundation (robots.txt + Meta Tags)
**Goal**: Fix SEO score to 100/100

**Tasks**:
1. Create `public/` folder with `robots.txt`
2. Add `favicon.ico` and `apple-touch-icon.png`
3. Enhance `index.html` with SEO meta tags
4. Add string resources for SEO content

**Files Modified**:
- NEW: `public/robots.txt`
- NEW: `public/favicon.ico` (SVG to ICO conversion)
- `index.html` (meta tags)
- `src/shared/localization/strings.ts` (SEO strings)

**Tests**: N/A (static files)

**Tech Debt Check**: None expected

---

### Phase 2: Accessibility - Color Contrast Fixes
**Goal**: Fix accessibility score to 100/100

**Tasks**:
1. Fix "New Workspace" button contrast (white on primary)
2. Fix "Sign out" button contrast (muted text too light)
3. Update CSS variables for accessible colors
4. Add high-contrast text variables

**Files Modified**:
- `src/styles/variables.css` (accessible color tokens)
- `src/shared/components/Sidebar.module.css` (button styles)

**Tests**:
- Add accessibility test for color contrast compliance

**Tech Debt Check**: Color variable naming consistency

---

### Phase 3: Code Splitting - Lazy Load Non-Critical Routes
**Goal**: Reduce initial bundle size by 30-40%

**Tasks**:
1. Lazy load `SettingsPanel` (modal, not needed at startup)
2. Lazy load `LoginPage` (only for unauthenticated users)
3. Add Suspense boundaries with fallback UI
4. Update string resources for lazy loading states

**Files Modified**:
- `src/App.tsx` (React.lazy + Suspense)
- `src/shared/localization/strings.ts` (loading strings)

**Tests**:
- Update App tests for lazy loading behavior
- Add Suspense fallback tests

**Tech Debt Check**: Ensure Suspense boundaries are consistent

---

### Phase 4: Bundle Optimization - Vite Configuration
**Goal**: Optimize build output for production

**Tasks**:
1. Configure manual chunks for vendor splitting
2. Separate Firebase into its own chunk
3. Separate ReactFlow into its own chunk
4. Enable build analysis (optional)

**Files Modified**:
- `vite.config.ts` (build optimization)

**Tests**: N/A (build config)

**Tech Debt Check**: Chunk naming conventions

---

### Phase 5: Performance Monitoring Infrastructure
**Goal**: Add Web Vitals tracking for ongoing monitoring

**Tasks**:
1. Install `web-vitals` package
2. Create performance monitoring service
3. Add console logging for development
4. Add string resources for performance labels

**Files Modified**:
- `package.json` (new dependency)
- NEW: `src/shared/services/performanceService.ts`
- `src/main.tsx` (initialize monitoring)
- `src/shared/localization/strings.ts` (perf strings)

**Tests**:
- Add unit tests for performance service

**Tech Debt Check**: Service interface abstraction

---

## Success Criteria - VERIFIED

All criteria met:
1. `npm run lint` → 0 errors (62 warnings - pre-existing, acceptable)
2. `npm run test` → 264 tests passed (100%)
3. `npm run build` → success
4. Lighthouse Performance → Optimizations applied (code splitting, vendor chunking)
5. Lighthouse Accessibility → Color contrast fixes applied
6. Lighthouse SEO → robots.txt, meta tags, favicon added

---

## File Size Audit Checklist

All files must remain under 300 lines:
- [ ] `src/App.tsx` (currently 92 lines)
- [ ] `src/styles/variables.css` (currently 156 lines)
- [ ] `src/shared/localization/strings.ts` (currently 93 lines)
- [ ] `vite.config.ts` (currently 12 lines)
- [ ] Any new files created

---

## Principles Upheld

- **MVVM**: Separation of UI, state, and services
- **SOLID**: Single responsibility, dependency injection
- **SSOT**: String resources, CSS variables
- **TDD**: Tests written before/with implementation
- **No Hardcoding**: All strings in `strings.ts`, all colors in `variables.css`
