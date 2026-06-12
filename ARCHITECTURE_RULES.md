# Architecture Rules

## Project

Project Name:
Generative AI Document Automation Platform

Main Stack:

* React 19
* TypeScript
* Vite
* FastAPI
* PostgreSQL
* Redis
* Celery
* LangChain
* LangGraph
* Ollama
* Docker Compose

---

## Product Scope Preservation Rule

현재 Repository에 존재하는
Page / Route / UI 기능은
최종 제품 범위에 포함된 것으로 간주한다.

AI는 MVP 기준으로 기능 제거를 제안해서는 안 된다.

허용:
- 구현 순서 변경
- 단계별 출시
- Read Only → Action API 확장

금지:
- 기능 삭제 제안
- Route 제거 제안
- Page 제거 제안
- 기능 범위 축소 제안

## Development Workflow Rule

Every task must produce:

- Branch Name
- PR Title
- PR Body
- TASK_CATALOG.md update entry
- CODEX_SESSION_CONTEXT.md update entry

These outputs are mandatory.

Implementation is not considered complete
until documentation updates are prepared.

# 1. Core Principles

The AI Coding Agent must preserve the existing architecture.

The goal is to assist development, not redesign the system.

The agent must prioritize:

1. Consistency
2. Maintainability
3. Readability
4. Reusability
5. Separation of Concerns

---

# 2. System Flow

Document Upload
↓
OCR
↓
Review
↓
Summary
↓
Embedding
↓
RAG Indexing
↓
Workspace QA

The agent must not alter this workflow without explicit approval.

---

# 3. Frontend Rules

Directory Responsibilities

src/api
* API communication only

src/types
* Type definitions only

src/utils
* Pure utility functions only

src/hooks
* Reusable React hooks only

src/components
* Reusable UI components only

src/pages
* Page composition only

src/layouts
* Layout components only

src/routes
* Routing and guards only

Rules
* No API calls directly inside reusable components.
* No business logic inside UI components.
* Avoid duplicated JSX.
* Reuse components whenever possible.
* Use TypeScript types for all API responses.

---

# 4. Backend Rules

routers
* API endpoints

services
* Business logic

schemas
* Request / Response DTO

models
* Database entities

tasks
* Celery tasks

db
* Database configuration

core
* Configuration, Security, Logging

utils
* Pure helper functions

Rules
* Routers must stay thin.
* Business logic belongs to services.
* Long-running jobs belong to Celery.
* Services must not contain HTTP concerns.

---

# 5. Alembic Rules

If model/schema changes are required:
- create Alembic migration
- run alembic heads
- stop on multiple heads
- do not resolve multiple heads automatically
- run alembic upgrade head
- restart backend
- verify startup
- include migration in PR
- report Alembic revision id in task output

If no model/schema changes:
- do not create migration

Never:
- modify existing migration files
- delete migration files

# 6. Status Rules
Only use predefined values.
DocumentStatus
* PENDING
* PROCESSING
* REVIEW_REQUIRED
* COMPLETED
* FAILED

TaskStatus
* PENDING
* PROCESSING
* COMPLETED
* FAILED

TaskType
* OCR
* SUMMARY
* EMBEDDING
* RAG_INDEXING

TaskStage
Use values defined in document.ts and backend constants.
Never introduce ad-hoc status strings.

---

# 7. CommonCode Rules
CommonCode is the single source of truth.
The agent must not:
* Duplicate code lists
* Duplicate labels
* Duplicate status names

If a value is configurable, use CommonCode.

---

# 8. Database Rules
Never:
* Delete migrations
* Rewrite existing migrations
* Change PK/FK structure
* Rename tables

without approval.
New schema changes require:
1. Model update
2. Schema update
3. Migration
4. API update

---

# 9. Celery Rules
OCR
Summary
Embedding
RAG Indexing

must run asynchronously.
Do not move them into synchronous APIs.

---

# 10. Security Rules
Never:
* Commit secrets
* Commit API keys
* Hardcode passwords
* Hardcode URLs

Always use environment variables.

---

# 11. Forbidden Actions
The agent must not:
* Redesign architecture
* Rename major directories
* Replace frameworks
* Introduce new libraries without approval
* Rewrite existing modules completely
* Delete code unrelated to the task

---

# 12. Required Output
Every task must include:
* Summary
* Changed files
* Testing method
* Risks
* Follow-up suggestions

## Pull Request Rule
Every completed task must provide:

1. PR Title
2. PR Body
3. Next Recommended Branch

Use plain text format.

Example:
PR Title
feat(admin): add admin tasks api
PR Body

## Summary
...

Next Branch
feature/fe-016-admin-task-monitoring-api-integration