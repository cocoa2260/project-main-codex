# Codex Session Context

## Project

Generative AI Document Automation Platform

---

## Completed Tasks

### FE-001 - StatusBadge Integration
Status: DONE
Summary:
* Implemented common StatusBadge component
* Centralized status metadata in documentStatus.ts
* Removed duplicated status mapping logic
* Applied StatusBadge to DashboardPage
* Applied StatusBadge to DocumentListPage
* Applied StatusBadge to DocumentCard
* Applied StatusBadge to ProcessingStatus

### FE-002-A
PipelineStepper Component
Status: DONE

### FE-002-B
DocumentStatusPage Integration
Status: DONE
Summary:
- Replaced duplicated stepper rendering logic
- Integrated reusable PipelineStepper
- Preserved review redirect behavior
- Preserved circular progress display
- Preserved activity log and right panel
- Preserved 6-step visual pipeline

### FE-003-A
TaskStage Compatibility Patch
Status: DONE
Summary:
- Extended normalizeTaskStage for backend raw stage values
- Added support for OCR_PENDING, OCR_PROCESSING, SUMMARY_PROCESSING, CHUNKING_PROCESSING, EMBEDDING_PROCESSING, RAG_READY and related stages
- Removed duplicated stage label logic
- Reused shared documentStatus utilities
- Build passed

### FE-006
DocumentList API Integration
Status: DONE
Summary:
- Replaced mock document list with real API data
- Connected getDocuments() API
- Preserved StatusBadge integration
- Fixed statusParam filter issue
- Build passed

### FE-008
Review API Integration
Status: DONE
Summary:
- Added review action for REVIEW_REQUIRED documents
- Supported review navigation in grid/list views
- Updated cancel-summary success navigation to /documents?status=REVIEW_REQUIRED
- Added guidance message for non-REVIEW_REQUIRED documents
- Removed duplicated document ID display
- Renamed “나중에 하기” to “요약 보류”
- Build passed

### FE-009
Summary API Validation
Status: DONE
Summary:
- Added keywords support to DocumentSummaryResponse
- Added safe keywords handling in SummaryPage
- Added status guidance banners for FAILED, PROCESSING and REVIEW_REQUIRED documents
- Restricted summary/chat actions to COMPLETED documents only
- Preserved existing API contracts and UI layout
- Build passed

### FE-010-A
Workspace Summary API Integration
Status: DONE
Summary:
- Connected DocumentWorkspacePage to getDocumentSummary API
- Replaced hardcoded workspace summary/meta data
- Added loading, error, and missing documentId handling
- Disabled question input because Chat/RAG API does not exist yet
- Removed misleading hardcoded RAG/chunk information
- Build passed

### FE-016
Admin Task Monitoring API Integration
Status: DONE
Summary:
- Added admin task API client for GET /api/admin/tasks and GET /api/admin/tasks/{task_id}
- Added admin task DTO types reusing TaskStatus, TaskType, TaskStage, and DocumentStatus from document.ts
- Replaced AdminJobPage task mock data with admin task API data
- Added loading, error, empty, pagination, manual refresh, and 30 second polling states
- Reused documentStatus.ts status presentation utilities for task status rendering
- Displayed API progress, task_type, status, stage, message, and error_message
- Preserved existing page layout, table columns, worker/queue/activity panels, and disabled future retry/cancel actions
- Build passed

Merged:
- develop

### FE-014
Admin Dashboard API Integration
Status: DONE
Summary:
- Added admin dashboard summary API client for GET /api/admin/dashboard/summary
- Added AdminDashboardSummaryResponse, AdminUserStats, AdminDocumentStats, AdminTaskStats, and AdminRecentEvent frontend DTOs
- Replaced AdminDashboardPage dashboard mock stats/events with API-backed data
- Added loading, error, empty, manual refresh, and 30 second polling states
- Reused DocumentStatus / TaskStatus / TaskType and documentStatus.ts status presentation utilities
- Preserved the existing dashboard layout, cards, and page sections
- Build passed

### FE-015
Admin Document Management API Integration
Status: DONE
Summary:
- Added admin document API client for GET /api/admin/documents and GET /api/admin/documents/{document_id}
- Added admin document DTO types reusing DocumentStatus, TaskStatus, and TaskType from document.ts
- Replaced AdminDocumentPage document mock data with admin document API data
- Added loading, error, empty, pagination, manual refresh, detail lookup, search, status filter, and sorting states
- Displayed API owner, status, latest task, progress, page count, file size, category, upload_at, and process_at data
- Reused StatusBadge and documentStatus.ts status presentation utilities
- Preserved existing page layout, table actions, right panels, and disabled future action buttons where backend APIs do not exist
- Build passed

### BE-ADMIN-004
Admin Users API
Status: DONE
Summary:
- Added admin users list API at GET /api/admin/users
- Added admin user detail API at GET /api/admin/users/{user_id}
- Added AdminUserListResponse, AdminUserListItemResponse, AdminUserDetailResponse, and AdminUserDocumentResponse DTOs
- Added pagination, q search, role filtering, and sorting support for admin user list
- Added User.name/User.email search and USER/ADMIN role filter validation
- Added document_count/upload_count aggregation from Document records
- Added user detail documents and recent TaskTracker data
- Protected endpoints with require_admin
- No DB migration or model changes
- py_compile and API auth checks passed

### BE-ADMIN-005
Admin System Health API
Status: DONE
Summary:
- Added admin system health API at GET /api/admin/system/health
- Added AdminSystemHealthResponse and AdminSystemHealthServiceResponse DTOs
- Added read-only health checks for API, PostgreSQL, Redis, Ollama, Storage, and Celery
- PostgreSQL health uses SELECT 1
- Redis health uses ping against REDIS_URL or Celery Redis broker/result backend
- Ollama health uses OLLAMA_URL and does not call LLM generation
- Storage health checks directory existence and read access
- Celery inspect failures and missing worker responses are reported as WARNING instead of failing the whole API
- Protected endpoint with require_admin
- No DB migration or model changes

### BE-ADMIN-006
Admin Queue / Worker Monitoring API
Status: DONE
Summary:
- Added admin queue monitoring API at GET /api/admin/queues
- Added admin worker monitoring API at GET /api/admin/workers
- Protected both endpoints with require_admin
- Added read-only Redis pending queue count collection
- Added read-only Celery inspect collection for active, reserved, scheduled, stats, and active queues
- Worker status values are limited to ACTIVE, IDLE, and WARNING
- Celery inspect, Redis connection, and worker non-response failures return WARNING details instead of failing the whole API response
- No DB migration, model changes, Docker changes, or Celery task logic changes

### BE-ADMIN-007
Admin Logs API
Status: DONE
Summary:
- Added admin log list API at GET /api/admin/logs
- Added admin log summary API at GET /api/admin/logs/summary
- Protected both endpoints with require_admin
- Used TaskTracker as the minimal event log source because no clear file-backed application log handler exists
- Added q, level, service, from, to, page, and limit support for log listing
- Restricted level filters to INFO, WARNING, ERROR, and SUCCESS
- Added sensitive value and internal path masking for returned log messages/details
- Log read failures return empty results with warning_message instead of failing the whole API
- No DB migration, model changes, Docker changes, logging structure changes, or action APIs

### BE-ADMIN-008
Admin Settings Read API
Status: DONE
Summary:
- Added admin settings read API at GET /api/admin/settings
- Returned OCR, LLM, Embedding, Worker, Storage, and Security settings categories
- Added AdminSettingsResponse, AdminSettingsCategoryResponse, and AdminSettingItemResponse DTOs
- Kept all returned settings editable=false for this read-only step
- Masked URL credentials defensively and did not expose SECRET_KEY, DATABASE_URL, passwords, API keys, or tokens
- Protected endpoint with require_admin
- No DB migration, model changes, environment variable changes, Docker changes, or settings save API
- py_compile and API auth checks passed

### BE-ADMIN-014
User Role Update API
Status: DONE
Summary:
- Added admin user role update API at PATCH /api/admin/users/{user_id}/role
- Added AdminUserRoleUpdateRequest DTO
- Reused AdminUserListItemResponse shape for role update response
- Allowed USER to ADMIN promotion
- Allowed ADMIN to USER demotion when policy checks pass
- Blocked self-demotion from ADMIN to USER
- Blocked demotion of the last remaining ADMIN
- Kept same-role requests idempotent with 200 response
- Protected endpoint with require_admin
- No DB migration, model changes, UserRole changes, Auth/JWT changes, or audit log table
- Audit log is deferred to a later task

### BE-ADMIN-011
User Account Status API
Status: DONE
Summary:
- Added UserStatus values ACTIVE, SUSPENDED, and INACTIVE
- Added User.status, User.last_active_at, User.suspended_at, and User.suspended_reason
- Added Alembic migration 20260614_000001_add_user_account_status
- Added admin user status update API at PATCH /api/admin/users/{user_id}/status
- Added status filter to GET /api/admin/users
- Added account status fields to admin user list and detail responses
- Blocked self-suspension for admin users
- Blocked suspension of the last active ADMIN account
- Blocked SUSPENDED users during login
- Blocked existing JWT access for SUSPENDED users in get_current_user
- Kept INACTIVE login allowed as display/status metadata
- Updated last_active_at on successful login

### BE-ADMIN-015
Admin Audit Log API
Status: DONE
Summary:
- Added AuditLog model backed by the audit_logs table
- Added Alembic migration 20260615_000001_create_audit_logs
- Added audit_service with record_admin_action and list_admin_audit_logs
- Sanitized audit old_value, new_value, reason, metadata, ip_address, and user_agent before persistence
- Recorded USER_ROLE_CHANGED on successful admin role changes
- Recorded USER_STATUS_CHANGED on successful admin status changes
- Captured actor_user_id, actor_email_snapshot, target_type, target_id, action, old/new values, reason, ip_address, user_agent, metadata, and created_at
- Added GET /api/admin/audit-logs protected by require_admin
- Added action, actor_user_id, target_type, target_id, from, to, page, and limit filters
- Preserved existing Admin Logs TaskTracker fallback API unchanged

### FE-017
Admin User Management API Integration
Status: DONE
Summary:
- Added admin user API client for GET /api/admin/users and GET /api/admin/users/{user_id}
- Added admin user DTO types reusing UserRole, DocumentStatus, TaskStatus, and TaskType where applicable
- Replaced AdminUserPage user mock data with admin users API data
- Added loading, error, empty, pagination, manual refresh, detail lookup, search(q), and USER/ADMIN role filter states
- Displayed API name, email, role, document_count, upload_count, created_at, detail documents, and recent tasks
- Preserved existing user management layout, status/action UI, right panels, and disabled future account actions where backend APIs do not exist
- Build passed

### FE-018
Admin System Health API Integration
Status: DONE
Summary:
- Added admin system health API client for GET /api/admin/system/health
- Added AdminSystemHealthResponse, AdminHealthService, and AdminHealthServiceStatus frontend DTOs
- Replaced AdminDashboardPage system health mock/derived service cards with API-backed health data
- Replaced AdminLogPage System Health mock data with the same admin health API client
- Displayed API, PostgreSQL, Redis, Ollama, Storage, and Celery statuses
- Mapped HEALTHY, WARNING, ERROR, and OFFLINE to existing green, yellow, red, and gray admin styles
- Added loading, error, manual refresh, and 30 second polling with useEffect cleanup
- Preserved existing admin dashboard/log cards, tables, and sections
- Build passed
- Targeted frontend eslint passed

### FE-019
Queue / Worker Monitoring Integration
Status: DONE
Summary:
- Added admin queue API client for GET /api/admin/queues
- Added admin worker API client for GET /api/admin/workers
- Added AdminQueueListResponse, AdminQueueItem, AdminWorkerListResponse, AdminWorkerItem, and AdminWorkerStatus frontend DTOs
- Replaced AdminJobPage queue mock-derived data with queue API data
- Replaced AdminJobPage worker mock-derived data with worker API data
- Displayed queue name, pending_count, active_count, scheduled_count, reserved_count, optional failed_count, optional oldest_task_age_seconds, and checked_at
- Displayed worker id/name/status, active/reserved/scheduled task counts, processed_count, current_queues, details, and checked_at
- Added independent loading, error, and empty states for queue and worker sections
- Included queue and worker refresh in manual refresh and 30 second polling with cleanup
- Preserved existing task table, monitoring cards, worker/queue sections, and disabled future action buttons

### FE-020
Admin Logs API Integration
Status: DONE
Summary:
- Added admin logs API client for GET /api/admin/logs and GET /api/admin/logs/summary
- Added AdminLogsResponse, AdminLogItem, AdminLogSummaryResponse, AdminLogLevel, and AdminLogListParams frontend DTOs
- Replaced AdminLogPage log mock data with API-backed log list data
- Replaced AdminLogPage summary/stat mock data with API-backed summary data
- Displayed timestamp, level, service, source, message, details, related_task_id, and related_document_id
- Connected search(q), level filter, service filter, page, and limit to API query params
- Added independent loading, error, empty, warning, pagination, manual refresh, and 30 second polling states for logs and summary
- Preserved System Health integration and existing log monitoring sections
- Kept API-less log actions disabled/prepared and did not implement state-changing log actions
- Backend unchanged

### FE-021
Admin Settings API Integration
Status: DONE
Summary:
- Added admin settings API client for GET /api/admin/settings
- Added AdminSettingsResponse, AdminSettingsCategory, AdminSettingItem, and AdminSettingValue frontend DTOs
- Replaced AdminSettingsPage mock/useState settings defaults with API-backed categories
- Rendered settings dynamically from backend categories including OCR, LLM, Embedding, Worker, Storage, and Security
- Added loading, error, empty, and manual refresh states
- Preserved settings category navigation, settings cards, active settings summary, save/reset UI, alerts, and change history section
- Kept settings UI read-only by disabling save/reset actions and showing prepared/read-only guidance
- Displayed sensitive settings only through masked API values without adding reveal controls
- Backend unchanged

### FE-024
User Role Update UI Integration
Status: DONE
Summary:
- Added admin user role update API client for PATCH /api/admin/users/{user_id}/role
- Added AdminUserRoleUpdateRequest and AdminUserRoleUpdateResponse frontend DTOs reusing UserRole
- Enabled the existing AdminUserPage role change action in the detail drawer
- Added confirmation modal for USER to ADMIN promotion and ADMIN to USER demotion
- Added role update loading lockout, success feedback, and backend policy error display
- Refreshed the user list after successful role updates
- Refreshed open user detail drawer data after successful role updates
- Kept account status, password reset, delete, export, and user creation actions disabled/prepared
- Did not modify localStorage auth_user directly
- Backend unchanged

### FE-025
User Account Status UI Integration
Status: DONE
Summary:
- Added admin user status update API client for PATCH /api/admin/users/{user_id}/status
- Added AdminUserStatus, AdminUserStatusUpdateRequest, and AdminUserStatusUpdateResponse frontend DTOs
- Added status, last_active_at, suspended_at, and suspended_reason to admin user list/detail DTOs
- Connected AdminUserPage account status badges and status filters to API response fields
- Enabled the existing account status action in the user table and detail drawer
- Added confirmation modal with target status select and reason input for SUSPENDED changes
- Added status update loading lockout, success feedback, and backend policy error display
- Refreshed the user list after successful status updates
- Refreshed open user detail drawer data after successful status updates
- Displayed last active time, suspended time, and suspended reason in the detail drawer
- Kept password reset, delete, export, and user creation actions disabled/prepared
- Did not modify localStorage auth_user directly
- Backend unchanged

---

### FE-011
Admin Route Audit
Status: DONE
Summary:
- Admin frontend routes already exist
- Admin pages already exist but mostly use mock/static data
- Sidebar supports admin variant
- Backend UserRole exists with USER / ADMIN
- JWT includes role
- require_admin dependency exists
- No Admin-only backend APIs exist yet
- Login response and frontend role storage are mismatched
- Frontend expects /api/auth/me but backend does not provide it

Next:
- AUTH-001 should be handled before Admin API work

### BE-ADMIN-001 완료

Endpoint
- GET /api/admin/dashboard/summary

구현 내용
- User Statistics
- Document Statistics
- Task Statistics
- Recent Events (TaskTracker 기반)

사용 예정
- FE-014 Admin Dashboard API Integration

### BE-ADMIN-002 완료

Endpoint
- GET /api/admin/documents
- GET /api/admin/documents/{document_id}

구현 내용
- Admin 전용 전체 문서 목록 조회
- Pagination(page, limit, total, total_pages)
- Filters(status, owner_id, search, uploaded_from, uploaded_to)
- Sorting(upload_at, updated_at, file_name, file_size, page_count, status)
- Owner 정보 포함
- TaskTracker updated_at desc 기준 latest task 포함
- 상세 응답에 summary, chunk_count, keywords 포함
- storage_path, celery_task_id, ocr_markdown 미노출

사용 예정
- FE-015 Admin Document Management API Integration

### BE-ADMIN-003 완료

Endpoint
- GET /api/admin/tasks
- GET /api/admin/tasks/{task_id}

구현 내용
- Admin 전용 전체 작업 목록 조회
- Admin 작업 상세 조회
- Pagination(page, limit, total, total_pages)
- Filters(status, task_type, stage, document_id, owner_id, search, created_from, created_to)
- Sorting(created_at, updated_at, started_at, completed_at, progress, status, task_type)
- Document / Owner 정보 포함
- celery_task_id 및 내부 경로 미노출
- OCR / Embedding / LLM / LangGraph / Celery task 로직 변경 없음
- DB migration 생성 없음

검증 결과
- python -m py_compile: 로컬 shell에 python 명령이 없어 실행 불가
- env PYTHONPYCACHEPREFIX=/tmp/codex-pycache python3 -m py_compile main.py routers/admin.py services/admin_service.py schemas/admin.py 통과
- backend Docker service startup/reload 확인
- GET /api/admin/tasks with ADMIN token: 200
- GET /api/admin/tasks with filters/sorting: 200
- GET /api/admin/tasks/{task_id} with ADMIN token: 200
- unauthenticated GET /api/admin/tasks: 401
- unauthenticated GET /api/admin/tasks/{task_id}: 401
- GET /api/admin/tasks with USER token: 403
- GET /api/admin/tasks/{task_id} with USER token: 403

사용 예정
- FE-016 Admin Task Monitoring API Integration

Next Recommended Task
- FE-015 Admin Document Management API Integration

### BE-ADMIN-012

Failed Task Retry API

Status: BLOCKED

Analysis Result:
- Retry API is partially feasible
- OCR retry can be implemented with a new TaskTracker and new Celery task
- SUMMARY retry is conditionally feasible if ocr_markdown exists
- EMBEDDING retry is not safe yet because summary and embedding currently share the same TaskTracker
- RAG_INDEXING retry is not feasible yet because the RAG indexing task is not fully defined
- Retry history is not currently tracked

Decision:
- Do not implement Failed Task Retry API yet
- Wait until SUMMARY and EMBEDDING task tracking are separated
- Ask embedding/summary owner to separate TaskTracker handling and failure reporting

Next Required Backend Work:
- Split SUMMARY and EMBEDDING TaskTracker handling
- Ensure embedding failures update TaskTracker and Document status consistently
- Remove ad-hoc EMBEDDING stage strings
- Define RAG_INDEXING task lifecycle before adding retry support

Related Future Task:
- BE-ADMIN-012 Failed Task Retry API

---

## Current Backlog

### FE-002 - PipelineStepper Integration

Status: READY

### FE-003 - API Response Type Cleanup

Status: TODO

### FE-004 - Sidebar Structure Cleanup

Status: TODO

---

## Scope For Codex

Allowed:

* Frontend Components
* Frontend Pages
* Frontend API Integration
* Frontend Types
* Admin UI

Not Allowed:

* OCR Logic
* Embedding Logic
* LangGraph Workflow
* Docker Compose Structure
* Database Schema
* Authentication Architecture

## Codex Output Rule

For every implementation task (FE / BE):

Codex must always provide:

1. Analysis Summary
2. Codex Prompt
3. Branch Name
4. PR Title
5. PR Body
6. TASK_CATALOG.md Update
7. CODEX_SESSION_CONTEXT.md Update

Do not omit any item.

Even if the task is analysis-first,
prepare the expected PR / Catalog / Session updates
so they are ready after implementation.

---

## Notes

* FE-001 has already centralized status badge rendering.
* Do not reintroduce duplicated status mapping logic.
* Reuse documentStatus.ts as the source of truth.

## Product Scope Policy

Important:

Admin pages currently contain many mock/static sections.

These features must not be treated as permanently excluded.

If a feature exists in the current UI design, it is considered part of the planned product scope.

When Codex recommends excluding a feature from MVP, it means:

- defer implementation to a later phase
- do not delete the UI
- do not remove the route
- do not remove the planned task from TASK_CATALOG
- do not describe it as unnecessary

MVP means implementation order, not product scope reduction.

Current Admin features that remain in final scope:

- Admin Dashboard
- Admin User Management
- Admin Document Management
- Admin Job Monitoring
- Admin Settings
- Admin Logs
- System Health
- Queue/Worker Monitoring
- Retry/Cancel actions where supported by backend policy
- Role-based access control

Implementation policy:

1. Read-only APIs first
2. State-changing Admin actions later
3. Infrastructure/control actions last
4. Sensitive settings/logs require explicit security review

## Admin Roadmap

Admin 기능은 이미 설계 완료 상태이다.

현재 존재:

- Admin Dashboard
- Admin Users
- Admin Documents
- Admin Jobs
- Admin Settings
- Admin Logs

현재 상태:

- UI 구현 완료
- 대부분 Mock 데이터

향후 계획:

Phase 1
- Dashboard
- Documents
- Tasks

Phase 2
- Users
- Settings
- Logs
- Health
- Queue
- Worker

Phase 3
- Retry
- Cancel
- Role Update
- User Status
- Settings Save

주의:

위 기능들은 모두 최종 제품 범위에 포함된다.
삭제 대상이 아니다.
