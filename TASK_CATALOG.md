# TASK_CATALOG

# Product Scope Policy

현재 UI에 존재하는 기능은
최종 제품 범위(Product Scope)에 포함된 기능이다.

"MVP 제외"는 기능 삭제를 의미하지 않는다.

의미:
- 구현 순서 조정
- 후순위 배치
- API 준비 후 구현

의미하지 않는 것:
- Route 제거
- Page 제거
- UI 제거
- 기능 삭제
- Task 제거

현재 범위에 포함되는 기능:
- Dashboard
- Document Management
- Review Flow
- Summary
- Workspace
- Chat/RAG
- Admin Dashboard
- Admin User Management
- Admin Document Management
- Admin Task Monitoring
- Admin Settings
- Admin Logs
- Queue Monitoring
- Worker Monitoring
- System Health
- Retry / Cancel
- Role Based Access Control

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
| FE-007 | Upload API Validation | High | DONE |
| FE-008 | Review API Integration | High | DONE |
| FE-009 | Summary API Validation | High | DONE |
| FE-010 | Workspace API Integration | High | DONE |

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
| FE-013 | Admin API Spec | High | DONE |

---

## PHASE 5 - Admin MVP Read APIs

| ID | Task | Priority | Status |
|------|------|------|------|
| BE-ADMIN-001 | Admin Dashboard Summary API | High | DONE |
| BE-ADMIN-002 | Admin Document List API | High | DONE |
| BE-ADMIN-003 | Admin Task List API | High | DONE |
| FE-014 | Admin Dashboard API Integration | High | DONE |
| FE-015 | Admin Document Management API Integration | High | DONE |
| FE-016 | Admin Task Monitoring API Integration | High | DONE |

---

## PHASE 6 - Admin Extended Features

| ID | Task | Priority | Status |
|------|------|------|------|
| BE-ADMIN-004 | Admin User List API | Medium | DONE |
| FE-017 | Admin User Management API Integration | Medium | DONE |
| BE-ADMIN-005 | Admin System Health API | Medium | DONE |
| FE-018 | Admin System Health Integration | Medium | DONE |
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

# DONE

- BE-ADMIN-002 Admin Documents API
- Admin 전체 문서 조회 API
- Admin 문서 상세 조회 API
- Pagination / Filters / Sorting 지원
- Owner / Latest Task 정보 포함

Priority: High
Status: DONE

### BE-ADMIN-003 Admin Tasks API

- Admin 전체 작업 조회 API
- Admin 작업 상세 조회 API
- Pagination / Filters / Sorting 지원
- Document / Owner 정보 포함
- celery_task_id 및 내부 경로 미노출

Priority: High
Status: DONE

### FE-016 Admin Task Monitoring API Integration

- AdminJobPage 작업 mock data 제거
- GET /api/admin/tasks 목록 연동
- GET /api/admin/tasks/{task_id} 상세 조회 연동
- Loading / Error / Empty 상태 추가
- Pagination / Refresh / 30초 Auto Refresh 지원
- TaskStatus / TaskType 기존 document.ts 타입 재사용
- documentStatus.ts 상태 표시 유틸 재사용

Priority: High
Status: DONE

### FE-015 Admin Document Management API Integration

- AdminDocumentPage 문서 mock data 제거
- GET /api/admin/documents 목록 연동
- GET /api/admin/documents/{document_id} 상세 조회 연동
- Owner / DocumentStatus / Latest Task / progress / file metadata 표시
- API pagination / search / status filter / sorting 연동
- Loading / Error / Empty / Refresh 상태 추가
- API 없는 action은 삭제하지 않고 준비 중/비활성 처리
- DocumentStatus / TaskStatus / TaskType 기존 document.ts 타입 및 documentStatus.ts 상태 표시 유틸 재사용

Priority: High
Status: DONE

### FE-014 Admin Dashboard API Integration

- AdminDashboardPage dashboard mock data 제거
- GET /api/admin/dashboard/summary 연동
- 사용자 / 문서 / 작업 통계 카드 API 데이터 바인딩
- 최근 이벤트 목록 API 데이터 바인딩
- Loading / Error / Empty 상태 추가
- 수동 Refresh 및 30초 Auto Refresh 지원
- DocumentStatus / TaskStatus / TaskType 기존 타입 및 documentStatus.ts 상태 표시 유틸 재사용

Priority: High
Status: DONE

### BE-ADMIN-004 Admin Users API

- Admin 전체 사용자 조회 API 추가
- Admin 사용자 상세 조회 API 추가
- Pagination / Search(q) / Role Filter / Sorting 지원
- User별 document_count / upload_count 집계 추가
- 사용자 상세에 문서 목록 및 최근 TaskTracker 10개 포함
- 모든 endpoint require_admin 보호
- DB model 변경 및 migration 없음

Priority: Medium
Status: DONE

### BE-ADMIN-005 Admin System Health API

- Admin 전용 시스템 헬스 조회 API 추가
- GET /api/admin/system/health
- API / PostgreSQL / Redis / Ollama / Storage / Celery 상태 반환
- PostgreSQL SELECT 1 확인
- Redis ping 확인
- Ollama는 OLLAMA_URL 기반 health 수준 확인만 수행하고 LLM 생성 호출 없음
- Storage 디렉토리 존재 여부 및 읽기 가능 여부 확인
- Celery inspect 실패 또는 worker 미응답은 WARNING 처리
- 모든 endpoint require_admin 보호
- DB model 변경 및 migration 없음

Priority: Medium
Status: DONE

### FE-017 Admin User Management API Integration

- AdminUserPage 사용자 mock data 제거
- GET /api/admin/users 목록 연동
- GET /api/admin/users/{user_id} 상세 조회 연동
- Pagination / Search(q) / USER, ADMIN Role Filter / Refresh 상태 추가
- 사용자 name / email / role / document_count / upload_count / created_at 표시
- 상세 drawer에 user info / documents / recent tasks 표시
- 백엔드에 없는 ACTIVE / SUSPENDED / INACTIVE 상태와 action UI는 삭제하지 않고 준비 중/비활성 처리

Priority: Medium
Status: DONE

### FE-018 Admin System Health Integration

- Admin system health mock data 제거
- GET /api/admin/system/health API client 추가
- AdminSystemHealthResponse / AdminHealthService DTO 추가
- AdminDashboardPage 시스템 상태 카드 API 데이터 바인딩
- AdminLogPage System Health 영역 API 데이터 바인딩
- API / PostgreSQL / Redis / Ollama / Storage / Celery 상태 표시
- Loading / Error / Refresh 상태 추가
- 30초 Auto Refresh 및 useEffect cleanup 적용
- 기존 Admin Dashboard / Logs UI 섹션 유지

Priority: Medium
Status: DONE
