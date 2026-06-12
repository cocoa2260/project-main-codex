# TASK_CATALOG

## PHASE 1 - Frontend Stabilization

| ID | Task | Priority | Status |
|------|------|------|------|
| FE-001 | StatusBadge Integration | High | DONE |
| FE-002-A | PipelineStepper Component | High | DONE |
| FE-002-B | DocumentStatusPage Integration | High | DONE |
| BUG-001 | EmbeddingModelOption Build Fix | High | DONE |
| FE-003-A | TaskStage Compatibility Patch | High | DONE |
| FE-003-B | API Response Type Cleanup | Medium | TODO |
| FE-004 | Sidebar Structure Cleanup | Medium | TODO |
| FE-005 | Topbar Commonization | Medium | TODO |

---

## PHASE 2 - User Pages

| ID | Task | Priority | Status |
|------|------|------|------|
| FE-006 | DocumentList API Integration | High | DONE |
| FE-007 | Upload API Validation | High | TODO |
| FE-008 | Review API Integration | High | DONE |
| FE-009 | Summary API Validation | High | DONE |
| FE-010 | Workspace API Integration | High | TODO |

---

## PHASE 3 - Backend Compatibility

| ID | Task | Priority | Status |
|------|------|------|------|
| BE-COMP-001 | TaskStage Standardization Review | High | TODO |
| BE-COMP-002 | Embedding Stage Normalization | Medium | TODO |
| BE-COMP-003 | TaskTracker Concurrency Review | Medium | TODO |

---

## PHASE 4 - Admin Investigation

| ID | Task | Priority | Status |
|------|------|------|------|
| FE-011 | Admin Route Audit | High | DONE |
| FE-012 | Admin Page Mock Audit | High | DONE |
| FE-013 | Admin API Spec | High | TODO |

---

## PHASE 5 - Admin MVP Read APIs

| ID | Task | Priority | Status |
|------|------|------|------|
| BE-ADMIN-001 | Admin Dashboard Summary API | High | TODO |
| BE-ADMIN-002 | Admin Document List API | High | TODO |
| BE-ADMIN-003 | Admin Task List API | High | TODO |
| FE-014 | Admin Dashboard API Integration | High | TODO |
| FE-015 | Admin Document Management API Integration | High | TODO |
| FE-016 | Admin Task Monitoring API Integration | High | TODO |

---

## PHASE 6 - Admin Extended Features

| ID | Task | Priority | Status |
|------|------|------|------|
| BE-ADMIN-004 | Admin User List API | Medium | TODO |
| FE-017 | Admin User Management API Integration | Medium | TODO |
| BE-ADMIN-005 | Admin System Health API | Medium | TODO |
| FE-018 | Admin System Health Integration | Medium | TODO |
| BE-ADMIN-006 | Admin Log List API | Medium | TODO |
| FE-019 | Admin Log Page API Integration | Medium | TODO |
| BE-ADMIN-007 | Admin Settings Read API | Medium | TODO |
| FE-020 | Admin Settings Page API Integration | Medium | TODO |

---

## PHASE 7 - Admin Control Actions

| ID | Task | Priority | Status |
|------|------|------|------|
| BE-ADMIN-008 | Failed Task Retry API | Medium | TODO |
| FE-021 | Failed Task Retry UI Integration | Medium | TODO |
| BE-ADMIN-009 | Document Retry API | Medium | TODO |
| FE-022 | Document Retry UI Integration | Medium | TODO |
| BE-ADMIN-010 | User Role Update API | Medium | TODO |
| FE-023 | User Role Update UI Integration | Medium | TODO |
| BE-ADMIN-011 | User Account Status API | Low | TODO |
| FE-024 | User Account Status UI Integration | Low | TODO |

---

# Notes

### FE-003-A

목표:
- Backend TaskStageCode와 Frontend TaskStage 호환성 확보
- normalizeTaskStage 확장
- PipelineStepper 상태 매핑 보강

### FE-008

Review API

사용 API:
- GET /api/documents/{id}/markdown
- POST /api/documents/{id}/confirm-summary
- POST /api/documents/{id}/cancel-summary

진입 조건:
- document.status == REVIEW_REQUIRED

### BE-COMP-001

목표:
- Backend TaskStageCode 표준화 검토
- Ad-hoc Stage 문자열 제거 여부 검토
- Frontend/Backend 계약 정리