---
description: Initialize a new development phase with proper setup
---

# Phase Start Workflow

## Purpose
Ensure each phase starts with a clean slate and clear objectives.

## Steps

### 1. Pull Latest Changes
```bash
git pull origin main
```

### 2. Verify Clean State
```bash
git status
```
**Criteria**: Working directory should be clean.

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Existing Tests
```bash
npm run test
```
**Criteria**: All existing tests must pass before adding new code.

### 5. Review Phase Objectives
- Open `task.md` artifact
- Identify items for current phase
- Mark first item as `[/]` (in progress)

### 6. Create TDD Test File First
Before any implementation:
- Create test file for the first feature
- Write failing test cases
- Commit test file: `git commit -m "test(scope): add tests for [feature]"`

## Ready to Implement
Only after tests are written, proceed with implementation.
