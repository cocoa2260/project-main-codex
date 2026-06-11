# Pull Request Checklist

## General

* [ ] Task objective completed
* [ ] Scope respected
* [ ] No unrelated changes
* [ ] No secrets committed
* [ ] No unnecessary libraries added

---

## Frontend

* [ ] TypeScript build passes
* [ ] No duplicated logic
* [ ] Reusable components used
* [ ] Types updated
* [ ] UI verified

---

## Backend

* [ ] Router/Service separation maintained
* [ ] Schemas updated
* [ ] Models updated
* [ ] Error handling exists
* [ ] Logging considered

---

## Database

* [ ] Migration created if needed
* [ ] Model matches migration
* [ ] No existing migration modified

---

## Celery

* [ ] Task status updated correctly
* [ ] Failure handling exists
* [ ] Retry policy considered

---

## OCR / Summary / Embedding

* [ ] Status updated
* [ ] Stage updated
* [ ] Failure state handled
* [ ] Logging added

---

## Docker

* [ ] Environment variables verified
* [ ] Service names unchanged
* [ ] Volumes unchanged unless required

---

## Testing

* [ ] Local build successful
* [ ] Backend startup successful
* [ ] Frontend startup successful
* [ ] No console errors
* [ ] No API errors

---

## Reviewer

Review Result:

* [ ] Approved
* [ ] Changes Requested

Reviewer Notes:

---
