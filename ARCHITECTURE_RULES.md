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

# 5. Status Rules

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

# 6. CommonCode Rules

CommonCode is the single source of truth.

The agent must not:

* Duplicate code lists
* Duplicate labels
* Duplicate status names

If a value is configurable, use CommonCode.

---

# 7. Database Rules

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

# 8. Celery Rules

OCR
Summary
Embedding
RAG Indexing

must run asynchronously.

Do not move them into synchronous APIs.

---

# 9. Security Rules

Never:

* Commit secrets
* Commit API keys
* Hardcode passwords
* Hardcode URLs

Always use environment variables.

---

# 10. Forbidden Actions

The agent must not:

* Redesign architecture
* Rename major directories
* Replace frameworks
* Introduce new libraries without approval
* Rewrite existing modules completely
* Delete code unrelated to the task

---

# 11. Required Output

Every task must include:

* Summary
* Changed files
* Testing method
* Risks
* Follow-up suggestions
