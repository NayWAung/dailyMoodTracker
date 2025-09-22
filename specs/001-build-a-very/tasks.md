# Tasks: Daily Mood Logging

**Input**: Design documents from `/Users/naywinaung/dailyMoodTracker/specs/001-build-a-very/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Tech stack: JavaScript ES2020+, Node.js 18+, Express.js, SQLite3, vanilla JS frontend
   → Structure: Web app (frontend + backend)
2. Load optional design documents: ✓
   → data-model.md: MoodEntry entity → model tasks
   → contracts/: 4 API endpoints → contract test tasks
   → research.md: Technical decisions → setup tasks
   → quickstart.md: 5 test scenarios → integration test tasks
3. Generate tasks by category: ✓
   → Setup: project init, Node.js setup, dependencies, linting, testing tools
   → Tests: 4 contract tests, 5 integration tests
   → Core: MoodEntry model, API endpoints, frontend components
   → Integration: SQLite setup, middleware, offline storage
   → Polish: performance tests, accessibility, security validation
4. Apply task rules: ✓
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...) ✓
6. Generate dependency graph ✓
7. Create parallel execution examples ✓
8. Validate task completeness: ✓
   → All 4 contracts have tests
   → MoodEntry entity has model
   → All 4 endpoints implemented
9. Return: SUCCESS (32 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Web app**: `backend/src/`, `frontend/src/`
- Paths shown below follow web application structure per plan.md

## Phase 3.1: Setup
- [ ] T001 Create project structure per implementation plan (backend/, frontend/, tests/)
- [ ] T002 Initialize Node.js project with package.json in backend/
- [ ] T003 [P] Configure ESLint and Prettier for JavaScript code quality (Code Quality Standards)
- [ ] T004 [P] Configure Jest testing framework with coverage reporting (Testing Excellence)
- [ ] T005 [P] Set up performance monitoring with timing budgets (Performance Requirements)
- [ ] T006 [P] Configure SQLCipher encryption for SQLite database (Security & Privacy)

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T007 [P] Contract test POST /api/moods in tests/contract/test_moods_post.js
- [ ] T008 [P] Contract test GET /api/moods/:date in tests/contract/test_moods_get_single.js
- [ ] T009 [P] Contract test GET /api/moods in tests/contract/test_moods_get_list.js
- [ ] T010 [P] Contract test DELETE /api/moods/:date in tests/contract/test_moods_delete.js
- [ ] T011 [P] Integration test first-time user experience in tests/integration/test_first_user.js
- [ ] T012 [P] Integration test update existing entry in tests/integration/test_update_entry.js
- [ ] T013 [P] Integration test view mood history in tests/integration/test_view_history.js
- [ ] T014 [P] Integration test offline functionality in tests/integration/test_offline.js
- [ ] T015 [P] Integration test validation and error handling in tests/integration/test_validation.js

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [ ] T016 [P] MoodEntry model in backend/src/models/MoodEntry.js
- [ ] T017 [P] Database setup with SQLite schema in backend/src/database/database.js
- [ ] T018 [P] Validation middleware in backend/src/middleware/validation.js
- [ ] T019 POST /api/moods endpoint in backend/src/routes/moods.js
- [ ] T020 GET /api/moods/:date endpoint in backend/src/routes/moods.js
- [ ] T021 GET /api/moods endpoint in backend/src/routes/moods.js
- [ ] T022 DELETE /api/moods/:date endpoint in backend/src/routes/moods.js
- [ ] T023 [P] Frontend HTML structure in frontend/src/index.html
- [ ] T024 [P] Frontend CSS styling in frontend/src/styles/main.css
- [ ] T025 Frontend JavaScript logic in frontend/src/js/app.js
- [ ] T026 Frontend offline storage service in frontend/src/js/offline.js

## Phase 3.4: Integration
- [ ] T027 Connect Express server with SQLite database in backend/src/server.js
- [ ] T028 CORS and security headers middleware in backend/src/middleware/security.js
- [ ] T029 Error handling and logging middleware in backend/src/middleware/errorHandler.js
- [ ] T030 Frontend API service integration in frontend/src/js/api.js

## Phase 3.5: Polish
- [ ] T031 [P] Performance tests - validate constitutional budgets (<100ms mood entry, <500ms history)
- [ ] T032 [P] UX consistency validation - design patterns and accessibility checks
- [ ] T033 [P] Code quality validation - complexity analysis and ESLint compliance
- [ ] T034 [P] Security validation - SQLCipher encryption and privacy compliance
- [ ] T035 [P] Unit tests for validation logic in tests/unit/test_validation.js
- [ ] T036 [P] End-to-end tests with Playwright in tests/e2e/test_complete_flow.js
- [ ] T037 Remove code duplication and optimize performance
- [ ] T038 Run complete quickstart.md validation scenarios

## Dependencies
- Setup (T001-T006) before everything
- Tests (T007-T015) before implementation (T016-T026)
- Database & Models (T016-T017) before API endpoints (T019-T022)
- API endpoints (T019-T022) before frontend integration (T030)
- Core implementation (T016-T030) before polish (T031-T038)

## Parallel Example
```
# Launch contract tests together (Phase 3.2):
Task: "Contract test POST /api/moods in tests/contract/test_moods_post.js"
Task: "Contract test GET /api/moods/:date in tests/contract/test_moods_get_single.js"
Task: "Contract test GET /api/moods in tests/contract/test_moods_get_list.js"
Task: "Contract test DELETE /api/moods/:date in tests/contract/test_moods_delete.js"

# Launch integration tests together (Phase 3.2):
Task: "Integration test first-time user experience in tests/integration/test_first_user.js"
Task: "Integration test update existing entry in tests/integration/test_update_entry.js"
Task: "Integration test view mood history in tests/integration/test_view_history.js"
Task: "Integration test offline functionality in tests/integration/test_offline.js"
Task: "Integration test validation and error handling in tests/integration/test_validation.js"

# Launch independent core tasks together (Phase 3.3):
Task: "MoodEntry model in backend/src/models/MoodEntry.js"
Task: "Database setup with SQLite schema in backend/src/database/database.js"
Task: "Validation middleware in backend/src/middleware/validation.js"
Task: "Frontend HTML structure in frontend/src/index.html"
Task: "Frontend CSS styling in frontend/src/styles/main.css"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task completion
- Follow constitutional TDD requirements
- Maintain <100ms mood entry performance budget
- Ensure SQLCipher encryption is properly configured

## Task Generation Rules Applied
1. **From Contracts**: 4 endpoints → 4 contract test tasks [P]
2. **From Data Model**: MoodEntry entity → model creation task [P] + database setup [P]
3. **From User Stories**: 5 quickstart scenarios → 5 integration tests [P]
4. **From Constitutional Requirements**: Security, performance, accessibility validation tasks

## Validation Checklist
- [x] All 4 contracts have corresponding tests
- [x] MoodEntry entity has model task
- [x] All 5 user stories have integration tests
- [x] Tests come before implementation (TDD)
- [x] Parallel tasks truly independent
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Constitutional requirements addressed in polish phase