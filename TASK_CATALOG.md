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
| FE-USER-001 | User Feature Gap Implementation | High | DONE |
| USER-CHAT-001 | User Chat API and UI Integration | High | DONE |
| CHAT-001 | Chat Session Management | High | DONE |
| CHAT-002 | Chat History Management | High | DONE |
| FE-USER-002 | User Document Actions Finalization | High | DONE |
| FE-USER-003 | User Settings Finalization | High | DONE |
| BE-USER-004 | User Settings APIs | High | DONE |
| USER-005 | User Document Download/Delete | High | DONE |
| USER-006 | User Document Reprocess/Cancel | High | DONE |
| UX-003 | Chat Workspace Unification | High | DONE |

---

## PHASE 3 - Backend Compatibility

| ID | Task | Priority | Status |
|------|------|------|------|
| BE-COMP-001 | TaskStage Standardization Review | High | TODO |
| BE-COMP-002 | Embedding Stage Normalization | Medium | TODO |
| BE-COMP-003 | TaskTracker Concurrency Review | Medium | TODO |
| BE-COMP-004 | Summary Embedding Task Split Implementation | High | DONE |

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
| BE-ADMIN-006 | Admin Queue / Worker Monitoring API | Medium | DONE |
| FE-019 | Queue / Worker Monitoring Integration | Medium | DONE |
| BE-ADMIN-007 | Admin Logs API | Medium | DONE |
| FE-020 | Admin Logs API Integration | Medium | DONE |
| BE-ADMIN-008 | Admin Settings Read API | Medium | DONE |
| FE-021 | Admin Settings API Integration | Medium | DONE |

---

## PHASE 7 - Admin Control Actions

| ID | Task | Priority | Status |
|------|------|------|------|
| BE-ADMIN-012 | Failed Task Retry API | Medium | DONE |
| FE-022 | Failed Task Retry UI Integration | Medium | DONE |
| BE-ADMIN-009 | Document Retry API | Medium | DONE |
| FE-023 | Document Retry UI Integration | Medium | DONE |
| BE-ADMIN-014 | User Role Update API | Medium | DONE |
| FE-024 | User Role Update UI Integration | Medium | DONE |
| BE-ADMIN-011 | User Account Status API | Low | DONE |
| FE-025 | User Account Status UI Integration | Low | DONE |
| BE-ADMIN-015 | Admin Audit Log API | Medium | DONE |
| FE-026 | Admin Audit Log UI Integration | Medium | DONE |
| BE-ADMIN-016 | Admin Document Delete API | Medium | DONE |
| FE-027 | Admin Document Delete UI Integration | Medium | DONE |
| FE-028 | Admin Document Original Export UI Integration | Medium | DONE |
| BE-ADMIN-017 | Admin Account Delete API | Medium | BLOCKED |
| BE-ADMIN-018 | Admin Document Original Export API | Medium | DONE |
| BE-ADMIN-020 | Audit Log Consistency Fix | Medium | DONE |
| BE-ADMIN-021 | Audit Log Regression Tests | Medium | DONE |

---

## PHASE 8 - Category Management

| ID | Task | Priority | Status |
|------|------|------|------|
| DOC-002 | Category Usage and Management | High | DONE |

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

### BE-COMP-004

- confirm-summary에서 EMBEDDING enqueue 제거
- SUMMARY TaskTracker와 EMBEDDING TaskTracker 분리
- Summary task 성공 시 SUMMARY row를 COMPLETED / 100 / SUMMARY_COMPLETED로 유지
- Summary 성공 후 EMBEDDING TaskTracker를 별도 생성하고 process_document_embedding enqueue
- Embedding task는 EMBEDDING row만 사용하고 chunk 미존재 시 FAILED 처리
- Embedding 완료 시 Document.status를 COMPLETED로 전환
- Failed Task Retry에서 EMBEDDING 재시도 지원
- EMBEDDING_PENDING TaskStage common code 추가

Priority: High
Status: DONE

### BE-ADMIN-021 Audit Log Regression Tests

- Added backend regression tests for admin audit log action filters
- Added backend regression tests for admin audit log target_type filters
- Verified invalid action and target_type values return 400
- Verified USER token returns 403 and unauthenticated access returns 401
- Verified FAILED_TASK_RETRY audit rows are filterable by action and TASK target_type
- Verified sensitive audit old_value / new_value / metadata keys are masked

Priority: Medium
Status: DONE

### DOC-002 Category Usage and Management

- Added read-only category list API at GET /api/categories
- Added admin category statistics API at GET /api/admin/categories/stats
- Added server-side user document category filter and category-aware search
- Added server-side admin document category filter and category-aware search
- Added user DocumentListPage category filter using fixed legal category list from the API
- Added AdminDocumentPage Category Filter and read-only category statistics panel
- Preserved DOC-001 category schema and avoided category create/update/delete, multi-category, approval, reclassification, drag/drop, auto category creation, and prompt management

Priority: High
Status: DONE

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

### BE-ADMIN-011 User Account Status API

- Admin 사용자 계정 상태 변경 API 추가
- PATCH /api/admin/users/{user_id}/status
- UserStatus ACTIVE / SUSPENDED / INACTIVE 추가
- User 모델에 status / last_active_at / suspended_at / suspended_reason 추가
- Admin 사용자 목록/상세 응답에 계정 상태 필드 포함
- Admin 사용자 목록 status 필터 지원
- SUSPENDED 계정 로그인 차단
- get_current_user에서 SUSPENDED 계정 기존 JWT 즉시 차단
- 자기 자신 SUSPENDED 차단
- 마지막 ADMIN SUSPENDED 차단
- INACTIVE는 로그인 허용 및 상태 표시용으로 유지
- Alembic migration 추가

Priority: Low
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

### FE-021 Admin Settings API Integration

- AdminSettingsPage 설정 mock/useState 기본값 제거
- GET /api/admin/settings 연동
- Admin settings DTO 및 API client 추가
- Backend categories 기준 카테고리/설정 카드 렌더링
- sensitive 값은 마스킹된 표시만 유지하고 원본 노출 액션 미추가
- 저장/초기화 UI는 삭제하지 않고 read-only/준비 중/disabled 처리
- Loading / Error / Empty / Refresh 상태 추가
- Backend 변경 없음

### USER-CHAT-001 User Chat API and UI Integration

- Added authenticated user document chat API at POST /api/documents/{document_id}/chat
- Enforced user document ownership and COMPLETED-only document policy
- Used summary, relevant document chunks, and OCR Markdown fallback as chat context
- Added LLM provider question-answer method and clear 502 handling for generation failures
- Persisted chat sessions and user/assistant messages using existing chat tables
- Added frontend chat request/response types and API client
- Connected DocumentChatPage question input, suggested questions, loading, error, answer, and citation rendering
- Connected DocumentWorkspacePage question input, loading, error, answer, and citation rendering
- No admin feature changes, DB schema changes, or migration

Priority: High
Status: DONE

### CHAT-001 Chat Session Management

- Added authenticated document chat session APIs for list, create, detail, delete, and session message send
- Reused the existing ChatSession model and enforced owner-only document/session access
- Preserved POST /api/documents/{document_id}/chat backward compatibility by using the latest session or creating a default session
- Enforced COMPLETED-only chat policy and document/session ownership checks

Priority: High
Status: DONE

### CHAT-002 Chat History Management

- Reused the existing ChatMessage model for persisted user and assistant messages
- Added session detail response with chronological message history
- Updated DocumentChatPage to load, switch, delete, and preserve per-session chat history after refresh
- Kept citation response shape unchanged and avoided citation schema redesign

Priority: High
Status: DONE

### FE-USER-002 User Document Actions Finalization

- Audited User document actions across DocumentListPage, DocumentDetailPage, DocumentStatusPage, DocumentWorkspacePage, and Dashboard recent activity
- Connected available actions to real routes/API-backed views: detail, status, review, summary, workspace, and chat
- Kept unsupported User original download, delete, retry/reprocess, and processing cancel actions disabled/prepared because no User API exists yet
- Removed misleading Dashboard recent document download behavior and replaced it with disabled/prepared state
- Exposed document file_size in the user document list response and rendered real file sizes in DocumentListPage and Dashboard recent documents
- Patched USER-CHAT-001 dark-theme readability issue by explicitly setting bright text on AI chat answer bubbles and reviewing citation/input/workspace/settings/detail/dashboard surfaces
- Preserved existing dark design system colors and avoided mock state-changing behavior

Priority: High
Status: DONE

Priority: Medium
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

### BE-ADMIN-006 Admin Queue / Worker Monitoring API

- Admin 전용 Queue 조회 API 추가
- Admin 전용 Worker 조회 API 추가
- GET /api/admin/queues
- GET /api/admin/workers
- Redis pending queue count 조회
- Celery inspect 기반 active / reserved / scheduled / worker 상태 조회
- Celery / Redis 조회 실패 시 API 전체 500 대신 WARNING 응답 처리
- Worker status는 ACTIVE / IDLE / WARNING 허용값으로 제한
- 모든 endpoint require_admin 보호
- DB model 변경 및 migration 없음
- Docker / Celery task 로직 변경 없음
- Read-only monitoring API only

### BE-ADMIN-014 User Role Update API

- Admin 사용자 Role 변경 API 추가
- PATCH /api/admin/users/{user_id}/role
- USER / ADMIN role 변경 지원
- 자기 자신을 USER로 강등하는 요청 차단
- 마지막 남은 ADMIN을 USER로 강등하는 요청 차단
- 동일 role 요청은 200 idempotent 처리
- 모든 endpoint require_admin 보호
- DB model 변경 및 migration 없음
- Auth / JWT 구조 변경 없음
- Audit log는 후속 task로 분리

Priority: Medium
Status: DONE

### BE-ADMIN-012 Failed Task Retry API

- Admin 실패 Task 재시도 API 추가
- POST /api/admin/tasks/{task_id}/retry
- OCR / SUMMARY TaskType만 지원
- FAILED 상태 TaskTracker만 재시도 허용
- 기존 FAILED TaskTracker는 변경하지 않고 새 TaskTracker 생성
- 동일 document / task_type 기준 PENDING 또는 PROCESSING Task 존재 시 409 반환
- OCR retry는 process_document_ocr.delay(document_id, new_task_id) 사용
- SUMMARY retry는 ocr_markdown 존재 시 process_document_summary.delay(document_id, new_task_id) 사용
- retry 등록 성공 시 Document.status를 PROCESSING으로 변경
- FAILED_TASK_RETRY audit log 기록
- EMBEDDING / RAG_INDEXING retry 미지원
- DB model 변경 및 migration 없음

Priority: Medium
Status: DONE

### BE-ADMIN-009 Document Retry API

- Admin 문서 단계별 재처리 API 추가
- POST /api/admin/documents/{document_id}/retry-from-stage
- retry_from_stage OCR / SUMMARY만 지원
- FAILED / COMPLETED / REVIEW_REQUIRED 문서만 재처리 허용
- PENDING / PROCESSING 문서 재처리 차단
- 동일 document에 PENDING 또는 PROCESSING TaskTracker 존재 시 409 반환
- OCR 재처리는 ocr_markdown / summary / DocumentChunk / DocumentEmbedding 삭제 후 OCR TaskTracker 생성
- SUMMARY 재처리는 summary / DocumentChunk / DocumentEmbedding 삭제 후 SUMMARY TaskTracker 생성
- 기존 TaskTracker는 삭제하거나 수정하지 않고 새 TaskTracker 생성
- 원본 PDF 및 storage_path 유지
- 재처리 enqueue 성공 후 Document.status를 PROCESSING으로 변경
- DOCUMENT_REPROCESS_REQUESTED audit log 기록
- EMBEDDING / RAG_INDEXING 재처리 미지원
- DB schema 변경 및 migration 없음

Priority: Medium
Status: DONE

### BE-ADMIN-007 Admin Logs API

- Admin 전용 로그 목록 조회 API 추가
- Admin 전용 로그 요약 조회 API 추가
- GET /api/admin/logs
- GET /api/admin/logs/summary
- 명확한 파일 로그 핸들러가 없어 TaskTracker 기반 이벤트 로그로 최소 구현
- Pagination / q / level / service / from / to 필터 지원
- level 값은 INFO / WARNING / ERROR / SUCCESS만 허용
- 민감정보 및 내부 파일 경로 마스킹 적용
- 모든 endpoint require_admin 보호
- DB model 변경 및 migration 없음
- Read-only logs API only

Priority: Medium
Status: DONE

### BE-ADMIN-008 Admin Settings Read API

- Admin Settings 화면용 설정 조회 API 추가
- GET /api/admin/settings
- OCR / LLM / Embedding / Worker / Storage / Security 카테고리로 설정 그룹화
- 모든 설정은 editable=false 고정
- 민감정보 미노출 및 URL credential 마스킹 적용
- 모든 endpoint require_admin 보호
- DB 저장 / migration / 환경변수 / Docker 변경 없음
- Read-only settings API only

Priority: Medium
Status: DONE

### FE-019 Queue / Worker Monitoring Integration

- Admin queue API client 추가
- Admin worker API client 추가
- Admin queue / worker DTO 타입 추가
- AdminJobPage queue mock-derived data 제거
- AdminJobPage worker mock-derived data 제거
- GET /api/admin/queues 기반 Queue 상태 표시
- GET /api/admin/workers 기반 Worker 상태 표시
- Queue / Worker 독립 loading / error / empty 상태 추가
- 기존 Refresh 및 30초 polling에 Queue / Worker 갱신 포함
- Read-only monitoring UI만 구현

Priority: Medium
Status: DONE

### FE-020 Admin Logs API Integration

- Admin logs API client 추가
- Admin logs DTO 타입 추가
- AdminLogPage log mock data 제거
- AdminLogPage summary/stat mock data 제거
- GET /api/admin/logs 목록 연동
- GET /api/admin/logs/summary 요약 연동
- q / level / service / page / limit API query 연결
- Pagination / Loading / Error / Empty / Refresh 상태 추가
- 30초 polling 및 unmount cleanup 적용
- 로그 action UI는 삭제하지 않고 준비 중/비활성 처리
- Backend 변경 없음
- Read-only logs monitoring UI만 구현

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

### FE-024 User Role Update UI Integration

- Admin user role update API client 추가
- Admin user role update DTO 타입 추가
- AdminUserPage 기존 역할 변경 액션을 PATCH /api/admin/users/{user_id}/role에 연결
- USER → ADMIN 승격 및 ADMIN → USER 강등 전 확인 모달 추가
- Role update 중 중복 클릭 방지 및 진행 상태 표시
- Backend 정책 에러/self-demotion/last-admin/권한/404/409 오류 메시지 표시
- 성공 후 사용자 목록 재조회 및 상세 drawer가 열려 있으면 상세 정보 재조회
- localStorage auth_user 직접 수정 없음
- 계정 중지, 비밀번호 재설정, 계정 삭제 등 API 없는 action은 준비중/비활성 유지
- Backend 변경 없음

Priority: Medium
Status: DONE

### FE-025 User Account Status UI Integration

- Admin user status update API client 추가
- AdminUserStatus / AdminUserStatusUpdateRequest / AdminUserStatusUpdateResponse DTO 타입 추가
- AdminUserPage 사용자 목록/상세 상태 표시를 API 응답 status 기반으로 변경
- Admin 사용자 목록 status 필터를 ACTIVE / SUSPENDED / INACTIVE에 연결
- 기존 계정 상태 action을 PATCH /api/admin/users/{user_id}/status에 연결
- 상태 변경 전 확인 모달 및 SUSPENDED 변경 사유 입력 필드 추가
- Status update 중 중복 클릭 방지 및 진행 상태 표시
- Backend 정책 에러/self-suspend/last-admin/권한/404/409 오류 메시지 표시
- 성공 후 사용자 목록 재조회 및 상세 drawer가 열려 있으면 상세 정보 재조회
- last_active_at / suspended_at / suspended_reason 상세 정보 표시
- localStorage auth_user 직접 수정 없음
- 비밀번호 재설정, 계정 삭제 등 API 없는 action은 준비중/비활성 유지
- Backend 변경 없음

Priority: Low
Status: DONE

### FE-USER-003 User Settings Finalization

- UserSettingsPage를 현재 로그인 사용자 정보 기반 설정 화면으로 정리
- `/api/auth/me` 응답을 우선 사용하고 실패 시 `localStorage auth_user` fallback 표시
- AuthUser / auth API normalization에 status 필드 보존 추가
- name / email / role / status 표시 추가
- 프로필 수정 입력은 read-only/disabled 처리하고 저장은 prepared 안내만 표시
- 비밀번호 변경 form submit은 API 호출 없이 차단하고 준비 중 안내 표시
- 알림 / 테마 / 언어 설정은 API 미존재 상태로 disabled/prepared 처리
- 기존 logout flow 연결 유지
- mock 저장 성공 메시지 추가 없음
- 다크 테마 설정/사이드바 표면에서 black/near-black 텍스트 hardcoding 재확인
- Admin / Chat / RAG / QA / Backend 변경 없음

Priority: High
Status: DONE

### BE-USER-004 User Settings APIs

- `/api/auth/me` 현재 사용자 응답에 status 포함
- 사용자 본인 프로필 이름 수정 API 추가
- PATCH /api/users/me/profile
- 사용자 본인 비밀번호 변경 API 추가
- PATCH /api/users/me/password
- 현재 비밀번호 확인 및 새 비밀번호 최소 길이 검증 적용
- 새 비밀번호는 hash 저장하며 요청/응답/로그에 비밀번호 원문 미노출
- UserSettingsPage 프로필 이름 저장 및 비밀번호 변경 form을 실제 API에 연결
- 프로필 저장 성공 시 localStorage auth_user 갱신
- 알림 / 테마 / 언어 preference 저장은 DB 구조 부재로 disabled/prepared 유지
- Admin / Chat / RAG / QA 기능 변경 없음
- DB model 변경 및 migration 없음

Priority: High
Status: DONE

### BE-ADMIN-015 Admin Audit Log API

- audit_logs 테이블 추가
- AuditLog 모델 추가
- Admin action 감사 기록용 audit_service 추가
- User Role 변경 성공 시 USER_ROLE_CHANGED 감사 로그 기록
- User Status 변경 성공 시 USER_STATUS_CHANGED 감사 로그 기록
- GET /api/admin/audit-logs 조회 API 추가
- action / actor_user_id / target_type / target_id / from / to / page / limit 필터 지원
- old_value / new_value / metadata 저장 전 민감정보 sanitization 적용
- Request context 기반 ip_address / user_agent 저장
- 모든 endpoint require_admin 보호
- Alembic migration 20260615_000001 추가

Priority: Medium
Status: DONE

### BE-ADMIN-016 Admin Document Delete API

- Admin 문서 삭제 API 추가
- DELETE /api/admin/documents/{document_id}
- Document 기준 cascade로 DocumentPage / DocumentChunk / DocumentEmbedding / TaskTracker 삭제
- 저장된 원본 PDF 및 OCR sidecar 후보 파일 존재 시 삭제
- 파일이 없으면 오류 없이 삭제 진행
- DOCUMENT_DELETED audit log 기록
- old_value / new_value / reason / ip_address / user_agent 저장
- 모든 endpoint require_admin 보호
- DB model 변경 및 migration 없음
- Frontend 변경 없음

Priority: Medium
Status: DONE

### FE-026 Admin Audit Log UI Integration

- Admin audit log API client 추가
- AdminAuditLogItem / AdminAuditLogsResponse / AdminAuditAction DTO 타입 추가
- AdminLogPage에 GET /api/admin/audit-logs 연동
- 기존 운영 로그 UI / 통계 카드 / 최근 에러 / 시스템 헬스 / disabled action 유지
- 감사 로그를 운영 로그와 구분된 별도 섹션으로 표시
- 감사 로그 action / from / to / page / limit 필터 연결
- 감사 로그 loading / error / empty / pagination 상태 추가
- 감사 로그 row 클릭 상세 표시 추가
- 기존 Refresh 및 30초 polling에 감사 로그 갱신 포함
- JSON 값은 compact stringify 및 길이 제한/스크롤 표시
- Backend 변경 없음

Priority: Medium
Status: DONE

### FE-027 Admin Document Delete UI Integration

- Admin document delete API client 추가
- AdminDocumentDeleteResponse DTO 타입 추가
- AdminDocumentPage 기존 삭제 action 활성화
- 삭제 전 확인 모달 / 삭제 대상 문서명 / 되돌릴 수 없음 경고 표시
- 삭제 요청 중 중복 클릭 방지
- 삭제 성공 후 문서 목록 refresh 및 열린 상세 패널 닫기
- 삭제 성공 메시지 및 backend error message 표시
- 다운로드 / 채팅 / 재시도 등 API 없는 action은 기존 준비중/비활성 정책 유지
- Frontend 변경만 수행
- Backend / API contract 변경 없음

Priority: Medium
Status: DONE

### FE-028 Admin Document Original Export UI Integration

- Admin original document export API client 추가
- GET /api/admin/documents/{document_id}/export?format=original 연동
- AdminDocumentPage 기존 다운로드 action을 원본 다운로드로 활성화
- responseType blob 기반 다운로드 trigger 추가
- Content-Disposition filename 우선 사용 및 document.file_name fallback 처리
- Blob URL revoke 처리 추가
- 다운로드 요청 중 중복 클릭 방지 및 진행 상태 표시
- 성공 메시지 및 backend error message 표시
- OCR Markdown / Summary / Metadata / Chunk / Embedding / ZIP export UI는 준비중/비활성 유지
- Frontend 변경만 수행
- Backend / API contract 변경 없음
### BE-ADMIN-018 Admin Document Original Export API

- Admin 문서 원본 PDF 다운로드 API 추가
- GET /api/admin/documents/{document_id}/export?format=original
- format 기본값은 original이며 original 외 값은 400 반환
- FileResponse로 application/pdf attachment 반환
- ADMIN은 소유자 제한 없이 전체 문서 원본 다운로드 가능
- 비인증 401 / USER 403 / 문서 없음 404 / storage 파일 없음 404 처리
- storage_path 및 파일 경로를 응답 body와 감사 로그에 노출하지 않음
- 성공한 original export에 대해서만 DOCUMENT_EXPORTED audit log 기록
- OCR Markdown / Summary / Metadata / Chunk / Embedding / ZIP export 미구현
- DB schema 변경 및 migration 없음

Priority: Medium
Status: DONE

### BE-ADMIN-020 Audit Log Consistency Fix

- FAILED_TASK_RETRY audit action 상수 추가
- Audit target type TASK 상수 추가
- GET /api/admin/audit-logs action filter에서 FAILED_TASK_RETRY 허용
- GET /api/admin/audit-logs target_type filter에서 TASK 허용
- 실패 작업 재시도 시 retry task와 FAILED_TASK_RETRY audit log를 같은 DB commit에 포함
- 기존 USER_ROLE_CHANGED / USER_STATUS_CHANGED / DOCUMENT_REPROCESS_REQUESTED / DOCUMENT_DELETED / DOCUMENT_EXPORTED action 필터 유지
- Frontend AdminAuditAction / AdminAuditTargetType 타입 최소 보정
- DB schema 변경 및 migration 없음

Priority: Medium
Status: DONE

### QA-002 Release Blocker Fixes

- Duplicate signup IntegrityError 500을 409 Conflict로 변환
- 중복 이메일 응답 메시지 `이미 가입된 이메일입니다.` 적용
- 회원가입 과정의 hashed password 로그 제거
- Admin System Health 응답 normalize 및 HEALTHY/status 카드 표시 보강
- Admin Queue / Worker 응답 normalize로 실제 상태 렌더링 보강
- Sidebar 사용자 정보 표시를 `/api/auth/me` 우선, localStorage fallback으로 변경
- USER 역할일 때 일반 Sidebar의 Admin 메뉴 숨김
- RAG / Chat / Summary / Embedding / Pipeline 변경 없음

Priority: High
Status: DONE

### QA-004 Minor Release Polish

- DocumentReviewPage에서 REVIEW_REQUIRED가 아닌 문서의 요약 계속 진행 / 요약 보류 버튼 비활성화
- REVIEW_REQUIRED가 아닌 상태에서 confirm-summary / cancel-summary click handler 실행 방지
- 검토 대기 상태에서만 가능한 작업이라는 기존 안내 유지
- Embedding default model을 backend registry 기준 available model 안의 유효한 값으로 정규화
- Upload 저장 metadata가 registry 밖 모델명으로 남지 않도록 selected_embedding_model 정규화
- Migration 없음
- Chat / RAG / Admin 신규 기능 / Pipeline 구조 변경 없음

Priority: Medium
Status: DONE

### UX-001 User UI Fix Pack

- 좌측 Sidebar 로그아웃 제거 및 우측 상단 로그아웃 버튼 아이콘 표시
- User/Admin 공통 Sidebar 접기/펼치기 및 localStorage 상태 유지 추가
- Sidebar 접힘 상태에서 아이콘 중심 메뉴와 실제 사용자 정보 표시 유지
- 문서 상세/상태/리뷰/요약/워크스페이스/채팅 화면 뒤로가기 UX를 history 기반 + `/documents` fallback으로 보정
- Dashboard 문서 상태 카드 이동 URL 및 DocumentListPage 초기 status query 반영 수정
- Dashboard 처리 현황 카운트를 문서 목록 데이터 기준으로 정리하고 AI Pipeline 영역을 OCR/Review/Summary/Embedding/Completed 흐름으로 명시
- DocumentListPage 목록형 table overflow, min-width, 문서명 truncate 적용
- DocumentSummaryPage OCR Markdown 보기 버튼 유지 및 `/documents/{documentId}/review` 이동 제공
- DocumentWorkspacePage 간략히 보기 동작을 채팅 화면 이동으로 변경
- DocumentChatPage 접힌 문서정보 패널 재펼침 버튼 가시성/동작 보강
- Chat/RAG/Summary-Embedding 실행 순서/DB migration/Admin 신규 기능 변경 없음

Priority: High
Status: DONE

### UX-002 Navigation Dashboard Polish

- 문서 상세/상태/리뷰/요약/워크스페이스/채팅 화면의 top navigation을 공통 PageTopNav로 정리
- User 문서/대시보드/설정 page top 영역의 Sidebar collapse button 제거, Sidebar 내부 control만 유지
- 문서 화면 back label을 "돌아가기"로 통일하고 status/review/summary/workspace/chat fallback route를 명시해 history loop 제거
- Dashboard 총 문서/실패 카드 이동 URL을 정정하고 DocumentListPage status query 필터를 URL 기준으로 반영
- DocumentReviewPage에 완료 문서용 "요약 보기" shortcut 추가
- Summary → Review 이동 시 review back이 summary로 돌아갈 수 있도록 명시적인 state.from 전달
- Chat/RAG/Summary-Embedding 실행 순서/DB migration/Admin 신규 기능 변경 없음

Priority: High
Status: DONE

### USER-006 User Document Reprocess/Cancel

- Added authenticated user document reprocess API at POST /api/documents/{document_id}/reprocess
- User reprocess is ownership-scoped and always restarts from OCR without exposing Admin stage selection
- Reprocess allows FAILED / COMPLETED / REVIEW_REQUIRED and blocks PENDING / PROCESSING with 409
- Reprocess clears OCR-derived artifacts, summary, chunks, embeddings, pages, and related artifact files while preserving existing TaskTracker rows
- Reprocess creates a new OCR TaskTracker, sets Document.status to PROCESSING, enqueues OCR, and records DOCUMENT_REPROCESS_REQUESTED with requested_by=user and retry_from=OCR metadata
- Added authenticated user document cancel API at POST /api/documents/{document_id}/cancel
- Cancel is ownership-scoped, allows PROCESSING only, marks Document.status FAILED, marks active TaskTracker rows FAILED, and stores "사용자 요청으로 취소됨"
- Cancel is logical MVP cancellation only; Celery revoke was intentionally not added
- Added frontend API clients and connected DocumentListPage / DocumentDetailPage reprocess and cancel actions with confirmation modals, loading states, success/error messages, and refresh flows
- No DB migration
- No Chat/RAG changes
- No Admin changes
- No Summary/Embedding pipeline order changes

Priority: High
Status: DONE

### UX-003 Chat Workspace Unification

- Removed the separate DocumentWorkspacePage frontend surface and `/documents/:id/workspace` route
- Consolidated document QA into DocumentChatPage as the single official document chat screen
- Added compact and detailed view modes to DocumentChatPage
- Kept compact mode focused on document name, question input, answers, and citations
- Added detailed mode document metadata, status, upload date, page count, embedding model, summary, questions, answers, and citations
- Removed Workspace navigation/actions from document list and document detail screens
- Preserved existing chat API, backend, DB, migrations, RAG logic, and Admin surfaces

Priority: High
Status: DONE

### ADMIN-001 | Prompt Management | DONE

- Added DB-backed `prompts` table with unique `prompt_key`
- Seeded `SUMMARY_PROMPT`, `CATEGORY_PROMPT`, and `QA_PROMPT`
- Added admin-only Prompt Management APIs:
  - GET `/api/admin/prompts`
  - GET `/api/admin/prompts/{prompt_key}`
  - PUT `/api/admin/prompts/{prompt_key}`
- Connected Summary, Category, and QA generation to prefer active DB prompts with existing hardcoded fallback
- Added `PROMPT_UPDATED` audit logging with `prompt_key` and `updated_by` metadata
- Added `/admin/prompts` frontend page with prompt list, detail loading, editing, save success, and save failure states
- Prompt versioning/history/rollback/export/import/diff/template marketplace/user prompt management intentionally not included

Priority: High
Status: DONE

### DOC-001 Category System Implementation

- Added normalized legal document category tables: `categories` and `document_categories`
- Seeded fixed legal categories: 민법, 형법, 민사소송법, 형사소송법, 상법, 행정법, 노동법, 조세법, 헌법, 지식재산권법, 개인정보보호법, 기타
- Enforced one category per document with a unique `document_categories.document_id` policy
- Added Category and DocumentCategory SQLAlchemy models and relationships
- Added LLM category classification prompt using OCR markdown + summary only
- Connected Summary completion flow to classify category before embedding pipeline starts
- Saved normalized category mapping in `document_categories` and legacy `documents.category` simultaneously
- Kept `documents.category` for legacy compatibility
- Extended user Document List response with `category_confidence`
- Extended Document Detail summary response with structured category name/confidence
- Updated DocumentListPage to keep category display and reflect confidence metadata
- Updated DocumentDetailPage to show category and confidence
- Admin category CRUD/search/statistics/management intentionally not included
- Multi category / primary-secondary category intentionally not included

Priority: High
Status: DONE
