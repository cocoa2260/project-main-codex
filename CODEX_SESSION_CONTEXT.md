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

### FE-USER-001
User Feature Gap Implementation
Status: DONE
Summary:
- Audited user document list, detail, status, summary, review, workspace, chat, settings, sidebar, and dashboard surfaces for unconnected UI
- Added `/settings` user route and connected the common user sidebar settings item to it
- Implemented minimal UserSettingsPage backed by `/api/auth/me` with unsupported write actions disabled/prepared
- Replaced placeholder DocumentDetailPage with API-backed document hub using `getDocumentSummary`
- Replaced DocumentChatPage hardcoded document/mock AI response with API-backed document context and disabled/prepared chat controls until product chat API is available
- Connected DocumentListPage upload, detail, status, summary, chat, and workspace actions where supported
- Marked user download/reprocess/cancel controls as disabled/prepared where no user API exists
- Replaced DashboardPage hardcoded recent activity with document API-backed recent documents
- Updated DocumentStatusPage misleading static system/queue metrics to API-backed status and prepared controls
- Verified build, touched frontend eslint, git diff --check, and limited browser smoke

### USER-CHAT-001
User Chat API and UI Integration
Status: DONE
Summary:
- Added POST /api/documents/{document_id}/chat for authenticated user document questions
- Enforced owner-only access and COMPLETED-only chat policy
- Returned answer, citations, session_id, and message_id from the chat API
- Built chat context from summary, relevant DocumentChunk rows, and OCR Markdown fallback
- Added LLM provider answer_question support with explicit generation failure handling
- Persisted chat sessions and messages using existing chat_sessions and chat_messages tables
- Connected DocumentChatPage to the real chat API with input, suggested questions, loading, error, answer, and citation states
- Connected DocumentWorkspacePage question panel to the real chat API with answer, loading, error, and citation states
- Added frontend chat DTOs and API client
- Verified backend py_compile, frontend build, touched frontend eslint, OpenAPI 200, user chat 200, other-user document 404, unauthenticated 401, incomplete document 409, and empty question 400
- No admin features changed
- No DB migration or schema changes

### BE-COMP-004
Summary Embedding Task Split Implementation
Status: DONE
Summary:
- Removed direct embedding enqueue from confirm-summary
- Kept confirm-summary creating and enqueueing only a SUMMARY TaskTracker
- Added trigger_embedding_pipeline service to create a separate EMBEDDING TaskTracker and persist its Celery task id
- Updated summary task success to leave Document.status as PROCESSING while SUMMARY stays COMPLETED / 100 / SUMMARY_COMPLETED
- Updated summary task success to trigger the embedding pipeline after summary commit
- Reworked embedding task to require an EMBEDDING TaskTracker and read existing DocumentChunk rows only
- Removed informal "EMBEDDING" stage writes from embedding task
- Added EMBEDDING_PENDING TaskStage constant, admin stage allowlist entry, frontend normalization, and common-code data migration 20260616_000001
- Updated embedding success to set EMBEDDING row COMPLETED / 100 / EMBEDDING_COMPLETED and Document.status COMPLETED
- Updated embedding failure to set EMBEDDING row FAILED / FAILED and Document.status FAILED
- Enabled failed EMBEDDING task retry through the admin retry service
- Verified OpenAPI 200, admin task API 200, Alembic current head, compile, frontend build, confirm-summary tracker split, summary-triggered embedding creation, and empty-chunk embedding failure handling

### BE-USER-004
User Settings APIs
Status: DONE
Summary:
- Included current user status in `/api/auth/me` and login user responses where available
- Added authenticated self-service profile update API at PATCH `/api/users/me/profile`
- Added authenticated self-service password change API at PATCH `/api/users/me/password`
- Enforced current password verification and new password minimum length validation
- Stored changed passwords through existing password hashing and did not return password fields
- Connected UserSettingsPage profile name editing to the real profile API
- Connected UserSettingsPage password change form to the real password API with success/error states
- Updated localStorage `auth_user` after successful profile save
- Kept notification, theme, and language preferences disabled/prepared because no user preference DB structure exists
- Preserved Admin, Chat, RAG, and QA behavior
- No DB migration or schema change

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

### BE-ADMIN-016
Admin Document Delete API
Status: DONE
Summary:
- Added admin document delete API at DELETE /api/admin/documents/{document_id}
- Added AdminDocumentDeleteResponse DTO
- Protected the endpoint with require_admin
- Deleted Document rows using existing Document relationship cascade for DocumentPage, DocumentChunk, DocumentEmbedding, and TaskTracker children
- Deleted stored original PDF and OCR sidecar candidate files when present
- Ignored missing storage files during deletion
- Recorded DOCUMENT_DELETED audit logs with document id, file name, status, deleted=true, reason, IP address, and user agent
- Added DOCUMENT_DELETED and DOCUMENT audit constants/filter support
- No DB migration, table, column, frontend, or Docker changes

### BE-ADMIN-021
Audit Log Regression Tests
Status: DONE
Summary:
- Added pytest regression coverage for GET /api/admin/audit-logs action allowlist filters
- Added pytest regression coverage for target_type allowlist filters
- Verified invalid action and target_type filters return 400
- Verified USER token access returns 403 and unauthenticated access returns 401
- Verified FAILED_TASK_RETRY rows are returned by action and TASK target_type filters
- Verified sensitive audit old_value, new_value, and metadata keys remain masked
- No API contract, DB schema, migration, frontend, or admin logic changes

### FE-028
Admin Document Original Export UI Integration
Status: DONE
Summary:
- Added admin original document export API client for GET /api/admin/documents/{document_id}/export?format=original
- Added blob download handling with Content-Disposition filename support and document.file_name fallback
- Added Blob URL creation, download trigger, and revoke cleanup
- Enabled AdminDocumentPage original download action with a clear "원본 다운로드" label
- Added duplicate-click prevention and in-row loading state while a download is pending
- Added success and backend error message display for original downloads
- Preserved delete and retry actions unchanged
- Kept unsupported export formats such as OCR Markdown, Summary, Metadata, Chunk, Embedding, and ZIP deferred/disabled
- Frontend-only change; backend and API contract unchanged

### BE-ADMIN-017
Admin Account Delete API
Status: BLOCKED
Analysis Result:
- DELETE /api/admin/users/{user_id} is technically possible
- Immediate implementation is not recommended
- User deletion affects documents, pages, chunks, embeddings, task trackers, chat sessions, chat messages, storage files and audit logs
- Hard delete is irreversible
- Soft delete would require DB migration
- Storage cleanup policy is required
- Running task policy is required
- Audit log policy is required

Recommended Policy:
- Use SUSPENDED for immediate access blocking
- Defer actual account deletion until deletion policy is finalized
- Block self delete
- Block last ADMIN delete
- Block delete when running tasks exist
- Record USER_DELETED audit event when implemented
- Clean up user-owned document storage files when hard delete is implemented

No Changes:
- No code changes
- No migration
- No commit
- No push

Next:
- Define account deletion policy
- Implement hard delete API only after policy confirmation

### BE-ADMIN-018
Admin Document Original Export API
Status: DONE
Summary:
- Added admin document original export API at GET /api/admin/documents/{document_id}/export?format=original
- Protected the endpoint with require_admin
- Defaulted missing format to original and rejected non-original formats with 400
- Returned stored original PDF through FileResponse with application/pdf and attachment filename based on document.file_name
- Allowed ADMIN users to export any document without owner restriction
- Returned 404 for missing Document rows, missing storage_path, and missing storage files without exposing storage_path or file paths
- Recorded DOCUMENT_EXPORTED audit logs only after successful export preparation
- Audit old_value includes document_id, file_name, and status
- Audit new_value includes exported=true and format=original
- Audit metadata includes format, content_type, and file_size only
- Did not export OCR Markdown, Summary, Metadata, Chunk, Embedding, or ZIP
- No DB migration or schema changes

### BE-ADMIN-020
Audit Log Consistency Fix
Status: DONE
Summary:
- Added FAILED_TASK_RETRY to AuditAction constants and admin audit action allowlist
- Added TASK to AuditTargetType constants and admin audit target_type allowlist
- Updated record_failed_task_retry to use shared AuditAction / AuditTargetType constants
- Persisted retry TaskTracker and FAILED_TASK_RETRY audit log in the same DB commit before returning retry success
- Kept USER_ROLE_CHANGED, USER_STATUS_CHANGED, DOCUMENT_REPROCESS_REQUESTED, DOCUMENT_DELETED, and DOCUMENT_EXPORTED filters available
- Added minimal frontend AdminAuditAction / AdminAuditTargetType type coverage for the expanded backend contract
- No DB migration, schema changes, AuditLog table changes, or OCR/Summary/Embedding/RAG logic changes

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

### FE-022
Failed Task Retry UI Integration
Status: DONE
Summary:
- Added admin task retry API client for POST /api/admin/tasks/{task_id}/retry
- Added AdminTaskRetryResponse DTO reusing TaskType and TaskStatus
- Enabled Retry action for FAILED OCR and FAILED SUMMARY tasks in AdminJobPage
- Kept EMBEDDING, RAG_INDEXING, PENDING, PROCESSING, and COMPLETED retry actions disabled
- Added confirmation before retry and request-in-flight duplicate click protection
- Displayed retry success and backend error messages without breaking the page
- Refreshed the task list after successful retry
- Preserved existing Queue, Worker, Task polling, detail, and monitoring UI behavior
- Backend unchanged and audit log creation remains backend-owned
- Build and touched frontend file eslint passed

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


### BE-ADMIN-012
Failed Task Retry API
Status: DONE
Summary:
- Added admin failed task retry API at POST /api/admin/tasks/{task_id}/retry
- Supported OCR and SUMMARY retries only
- Preserved existing FAILED TaskTracker rows and created new TaskTracker rows for retry attempts
- Enqueued OCR retry through process_document_ocr.delay(document_id, retry_task_id)
- Enqueued SUMMARY retry through process_document_summary.delay(document_id, retry_task_id)
- Rejected non-FAILED retry targets with 409
- Rejected duplicate PENDING/PROCESSING task for the same document/task_type with 409
- Required ocr_markdown for SUMMARY retry
- Updated Document.status to PROCESSING after successful retry registration
- Added FAILED_TASK_RETRY audit log output
- No DB migration, model schema changes, EMBEDDING retry, or RAG_INDEXING retry

### BE-ADMIN-009
Document Retry API
Status: DONE
Summary:
- Added admin document retry API at POST /api/admin/documents/{document_id}/retry-from-stage
- Protected the endpoint with require_admin
- Added AdminDocumentRetryRequest and AdminDocumentRetryResponse DTOs
- Supported retry_from_stage OCR and SUMMARY only
- Allowed retry for FAILED, COMPLETED, and REVIEW_REQUIRED documents
- Blocked PENDING and PROCESSING documents with 409
- Blocked retry when the document already has PENDING or PROCESSING TaskTracker rows
- OCR retry clears ocr_markdown, summary, DocumentChunk, and DocumentEmbedding rows while preserving the original PDF/storage_path
- SUMMARY retry requires ocr_markdown and clears summary, DocumentChunk, and DocumentEmbedding rows while preserving ocr_markdown and storage_path
- Preserved existing TaskTracker rows and created new TaskTracker rows for retry attempts
- Enqueued OCR retry through process_document_ocr.delay(document_id, retry_task_id)
- Enqueued SUMMARY retry through process_document_summary.delay(document_id, retry_task_id)
- Updated Document.status to PROCESSING after successful retry registration
- Recorded DOCUMENT_REPROCESS_REQUESTED audit logs with previous status, retry stage, retry task id, reason, and cleared artifacts
- No DB migration, Alembic change, schema migration, EMBEDDING retry, or RAG_INDEXING retry

### FE-023
Document Retry UI Integration
Status: DONE
Summary:
- Added admin document retry API client for POST /api/admin/documents/{document_id}/retry-from-stage
- Added AdminDocumentRetryStage, AdminDocumentRetryRequest, and AdminDocumentRetryResponse frontend DTOs
- Enabled AdminDocumentPage document retry actions for FAILED, COMPLETED, and REVIEW_REQUIRED documents
- Kept PENDING and PROCESSING retry actions disabled in the UI while relying on backend policy for final validation
- Added retry confirmation modal with target document name, OCR/SUMMARY stage selection, optional reason input, and artifact reset warning copy
- Prevented duplicate retry clicks during requests
- Displayed backend retry errors without breaking the page
- Refreshed the document list after successful retry registration and closed the detail panel for the retried document
- Preserved delete integration and kept download/chat/prepared actions disabled where APIs do not exist

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

### FE-026
Admin Audit Log UI Integration
Status: DONE
Summary:
- Added admin audit log API client for GET /api/admin/audit-logs
- Added AdminAuditLogItem, AdminAuditLogsResponse, AdminAuditAction, and filter DTO types
- Integrated audit logs into AdminLogPage as a separate section from operational logs
- Preserved existing operational logs, log stats, recent errors, system health, export, copy, retry, and document action UI
- Added audit action, from, to, page, and limit query support in the UI flow
- Added audit log loading, error, empty, refresh, polling, and pagination states
- Added audit row click detail display for actor, action, target, old/new values, reason, IP, user agent, metadata, and created_at
- Added safe compact JSON rendering with truncation/scrolling for audit old_value, new_value, and metadata
- Included audit logs in existing refresh and 30 second polling cleanup
- Backend unchanged

### FE-027
Admin Document Delete UI Integration
Status: DONE
Summary:
- Added admin document delete API client for DELETE /api/admin/documents/{document_id}
- Added AdminDocumentDeleteResponse frontend DTO type
- Enabled the existing AdminDocumentPage delete action for every document status
- Added delete confirmation modal with target file name and irreversible deletion warning
- Added delete request lockout, row spinner, backend error display, and success feedback
- Refreshed the document list after successful deletion
- Closed the open document detail panel when its document is deleted
- Preserved disabled/prepared download, chat, retry, and other API-less document actions
- Backend unchanged and DOCUMENT_DELETED audit logging remains backend-owned

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

## 2026-06-17 FE-USER-002 User Document Actions Finalization

Branch: feature/fe-user-002-document-actions-finalization

Implemented:

- Added `file_size` to the user document list API response schema so user list/dashboard cards can show real file metadata instead of `-`.
- Updated frontend `DocumentItem` type and rendered formatted file sizes in `DocumentListPage` and Dashboard recent documents.
- Audited User document action surfaces:
  - real route/API-backed actions remain enabled: detail, status, review, summary, workspace, chat
  - User original download, delete, retry/reprocess, and processing cancel remain disabled/prepared because no User API exists
  - Dashboard recent document download no longer appears as a clickable mock action
- Added prepared disabled download/retry/delete actions to `DocumentDetailPage` so unsupported User actions are explicit.
- Added prepared disabled delete affordances to `DocumentListPage`.
- Fixed USER-CHAT-001 dark theme regression by explicitly applying bright text to AI chat answer bubbles; reviewed citation area, question input, workspace answer area, user settings, document detail, and dashboard recent activity for black/near-black text risks.

Verification:

- `npm run build` in `front-end` passed.
- `npm run lint` in `front-end` passed.
- Dark-theme hardcoding scan for user document/dashboard/settings/chat surfaces found no `text-black`, `text-gray-900`, `text-slate-900`, `fill-black`, or `stroke-black` matches after edits.
- `python3 -m pytest back-end/tests` could not run in this local environment because `pytest` is not installed.

주의:

위 기능들은 모두 최종 제품 범위에 포함된다.
삭제 대상이 아니다.

## 2026-06-17 FE-USER-003 User Settings Finalization

Branch: feature/fe-user-003-settings-finalization

Implemented:

- Finalized `UserSettingsPage` as a usable account settings surface.
- Preserved the existing `/settings` sidebar route and logout flow.
- Displayed authenticated user name, email, role, and status when available.
- Kept `/api/auth/me` as the preferred user source and added intentional `localStorage auth_user` fallback display.
- Extended frontend auth user normalization to preserve account status from login/me responses.
- Kept profile fields read-only/disabled because no user profile update API exists.
- Blocked profile/password prepared form submits without calling nonexistent APIs.
- Kept notification, theme, and language settings disabled/prepared because no preference APIs exist.
- Removed misleading mock-save behavior by showing only prepared guidance, not success.
- Rechecked User settings/sidebar dark-theme classes for black or near-black text/icon hardcoding.

Verification:

- `npm run lint` in `front-end` passed.
- `npm run build` in `front-end` passed.
- `git diff --check` passed.
- Direct `POST /api/auth/login` and `GET /api/auth/me` check returned the expected current user payload.
- Dark-theme hardcoding scan for user settings/sidebar found no `text-black`, `text-gray-900`, `text-slate-900`, `fill-black`, or `stroke-black` matches.
- Browser smoke was attempted with the in-app browser, but protected-route session setup could not be completed because the automation page context does not expose `localStorage`.

Scope notes:

- Admin settings unchanged.
- Chat / RAG / QA unchanged.
- No backend schema, migration, or API changes.

## 2026-06-17 QA-002 Release Blocker Fixes

Branch: feature/qa-002-release-blocker-fixes

Implemented:

- Fixed duplicate signup to return 409 Conflict with `이미 가입된 이메일입니다.` instead of leaking a database IntegrityError as 500.
- Preserved normal signup behavior for new emails.
- Removed hashed password logging from the signup path.
- Updated Admin Health UI to normalize API responses and render explicit `HEALTHY` status cards with non-placeholder details for healthy services.
- Updated Admin Queue and Worker API clients to normalize wrapped or array responses so real queue/worker states render instead of staying in loading placeholders.
- Updated Sidebar to load the real user from `/api/auth/me` first, then fall back to `localStorage auth_user`.
- Removed hardcoded sidebar user/admin display values.
- Hid the Admin menu from USER role users while preserving ADMIN visibility.

Verification:

- Backend duplicate signup and normal signup checks completed.
- Frontend Admin Health, Queue, Worker, Sidebar user info, and USER Admin-menu behavior checked through build/lint and code-path verification.
- `npm run build` in `front-end` passed.
- `npm run lint` in `front-end` passed.
- `python compile` passed for `back-end`.
- `git diff --check` passed.

Scope notes:

- RAG unchanged.
- Chat unchanged.
- Summary unchanged.
- Embedding unchanged.
- Pipeline unchanged.
- Admin permission policy unchanged; only USER sidebar menu visibility changed.

## 2026-06-17 QA-004 Minor Release Polish

Branch: feature/qa-004-minor-release-polish

Implemented:

- Disabled DocumentReviewPage summary confirmation and hold actions unless the document is in REVIEW_REQUIRED.
- Added handler guards so non-REVIEW_REQUIRED documents cannot call confirm-summary or cancel-summary from the review page.
- Preserved the existing non-review-required warning guidance.
- Added a backend embedding model resolver that falls back to the first registered embedding model when the configured/default model is not available.
- Updated the embedding model options API to return a default_model that is included in the available models list.
- Updated upload document creation to store the resolved embedding model so document metadata stays aligned with available models.

Verification:

- `npm run lint` in `front-end` passed.
- `npm run build` in `front-end` passed.
- Backend compile passed.
- `/openapi.json` returned 200.
- Upload page/API default model check confirmed `default_model` is included in the available model list.

Scope notes:

- No migration.
- No Chat/RAG changes.
- No Admin feature changes.
- No Pipeline structure changes.
