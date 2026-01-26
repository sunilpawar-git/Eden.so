---
description: Complete a development phase with full verification and tech debt removal
---

# Phase Completion Workflow

## Verification Steps

// turbo-all

### 1. Run Tests
```bash
npm run test
```
**Gate**: 100% pass. Stop if any fail.

### 2. Run Build
```bash
npm run build
```
**Gate**: Zero errors.

### 3. Run Linting
```bash
npm run lint
```
**Gate**: Zero errors.

### 4. File Size Audit
```bash
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 300 {print "❌ OVER LIMIT:", $2, $1, "lines"}'
```
**Gate**: No output. If files listed, split before continuing.

### 5. Hardcoded String Check
```bash
grep -rn ">[A-Z][a-z]" src/features --include="*.tsx" | grep -v "import\|from\|className\|//"
```
**Gate**: No inline user-facing strings.

### 6. Security Checks
```bash
# Check for any type
grep -rn ": any" src --include="*.ts" --include="*.tsx" | grep -v "test\|spec"
```
**Gate**: Zero matches in production code.

### 7. Tech Debt Documentation
Before commit, answer in commit message:
- What debt was incurred?
- How was it resolved?
- Any deferred items? (Should be ZERO)

### 8. Commit & Tag
```bash
git add .
git commit -m "feat(phaseX): complete phase X - [description]"
git tag phase-X-complete
git push origin main --tags
```

## Post-Completion
- Update `task.md` checkboxes
- Review next phase scope
