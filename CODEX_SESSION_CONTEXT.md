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

Merged:
- develop

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