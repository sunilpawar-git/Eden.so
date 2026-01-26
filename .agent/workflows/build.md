---
description: Run build, tests, and linting for the project
---

# Build & Test Workflow

## Prerequisites
- Node.js 18+ installed
- Project dependencies installed (`npm install`)

## Steps

// turbo-all

### 1. Install Dependencies (if needed)
```bash
npm install
```

### 2. Run Linting
```bash
npm run lint
```

### 3. Run Tests
```bash
npm run test
```

### 4. Build Production Bundle
```bash
npm run build
```

## Success Criteria
- All commands exit with code 0
- No lint errors
- All tests pass
- Build produces `dist/` folder
