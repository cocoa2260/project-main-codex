from datetime import datetime
from datetime import date
from datetime import time
from datetime import timezone
from math import ceil
from uuid import UUID

from sqlalchemy import and_
from sqlalchemy import func
from sqlalchemy import inspect
from sqlalchemy import or_
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload

from models.document import Document
from models.document import DocumentStatus
from models.document_chunk import DocumentChunk
from models.task_tracker import TaskStatus
from models.task_tracker import TaskTracker
from models.task_tracker import TaskType
from models.user import User
from models.user import UserRole
from schemas.admin import AdminDashboardSummaryResponse
from schemas.admin import AdminDocumentDetailResponse
from schemas.admin import AdminDocumentListItemResponse
from schemas.admin import AdminDocumentListResponse
from schemas.admin import AdminTaskDetailResponse
from schemas.admin import AdminTaskDocumentResponse
from schemas.admin import AdminTaskListItemResponse
from schemas.admin import AdminTaskListResponse
from schemas.admin import AdminUserDetailResponse
from schemas.admin import AdminUserDocumentResponse
from schemas.admin import AdminUserListItemResponse
from schemas.admin import AdminUserListResponse
from schemas.admin import AdminLatestTaskResponse
from schemas.admin import AdminOwnerResponse
from schemas.admin import AdminPaginationResponse
from schemas.admin import DocumentStatsResponse
from schemas.admin import RecentEventResponse
from schemas.admin import TaskStatsResponse
from schemas.admin import UserStatsResponse


def _today_bounds() -> tuple[datetime, datetime]:
    today = datetime.now(timezone.utc).date()
    start = datetime.combine(today, time.min, tzinfo=timezone.utc)
    end = datetime.combine(today, time.max, tzinfo=timezone.utc)
    return start, end


def _count_by(db: Session, model, column) -> dict[str, int]:
    rows = (
        db.query(column, func.count(model.id))
        .group_by(column)
        .all()
    )
    return {str(key): count for key, count in rows}


def _fill_counts(values: dict[str, int], expected_values: list[str]) -> dict[str, int]:
    return {
        value: values.get(value, 0)
        for value in expected_values
    }


def _date_start(value: date) -> datetime:
    return datetime.combine(value, time.min, tzinfo=timezone.utc)


def _date_end(value: date) -> datetime:
    return datetime.combine(value, time.max, tzinfo=timezone.utc)


def _latest_task_subquery():
    return (
        func.row_number()
        .over(
            partition_by=TaskTracker.document_id,
            order_by=(
                TaskTracker.updated_at.desc(),
                TaskTracker.id.desc(),
            ),
        )
        .label("row_number")
    )


def _build_latest_task_query(db: Session):
    latest_task = (
        db.query(
            TaskTracker.id.label("id"),
            TaskTracker.document_id.label("document_id"),
            TaskTracker.task_type.label("task_type"),
            TaskTracker.status.label("status"),
            TaskTracker.stage.label("stage"),
            TaskTracker.progress.label("progress"),
            TaskTracker.message.label("message"),
            TaskTracker.error_message.label("error_message"),
            TaskTracker.started_at.label("started_at"),
            TaskTracker.completed_at.label("completed_at"),
            TaskTracker.created_at.label("created_at"),
            TaskTracker.updated_at.label("updated_at"),
            _latest_task_subquery(),
        )
        .subquery()
    )
    return latest_task


def _owner_response(user: User) -> AdminOwnerResponse:
    return AdminOwnerResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
    )


def _latest_task_response(row) -> AdminLatestTaskResponse | None:
    if row.task_id is None:
        return None

    return AdminLatestTaskResponse(
        id=row.task_id,
        task_type=row.task_type,
        status=row.task_status,
        stage=row.task_stage,
        progress=row.task_progress,
        message=row.task_message,
        error_message=row.task_error_message,
        started_at=row.task_started_at,
        completed_at=row.task_completed_at,
        created_at=row.task_created_at,
        updated_at=row.task_updated_at,
    )


def _document_list_item_response(row) -> AdminDocumentListItemResponse:
    return AdminDocumentListItemResponse(
        id=row.document_id,
        file_name=row.file_name,
        status=row.document_status,
        category=row.category,
        file_size=row.file_size,
        page_count=row.page_count,
        selected_embedding_model=row.selected_embedding_model,
        upload_at=row.upload_at,
        process_at=row.process_at,
        created_at=row.document_created_at,
        updated_at=row.document_updated_at,
        owner=AdminOwnerResponse(
            id=row.owner_id,
            email=row.owner_email,
            name=row.owner_name,
            role=row.owner_role,
        ),
        latest_task=_latest_task_response(row),
    )


def _task_document_response(row) -> AdminTaskDocumentResponse:
    return AdminTaskDocumentResponse(
        id=row.document_id,
        file_name=row.file_name,
        status=row.document_status,
        category=row.category,
        upload_at=row.upload_at,
        updated_at=row.document_updated_at,
    )


def _task_list_item_response(row) -> AdminTaskListItemResponse:
    return AdminTaskListItemResponse(
        id=row.task_id,
        task_type=row.task_type,
        status=row.task_status,
        stage=row.task_stage,
        progress=row.task_progress,
        message=row.task_message,
        error_message=row.task_error_message,
        started_at=row.task_started_at,
        completed_at=row.task_completed_at,
        created_at=row.task_created_at,
        updated_at=row.task_updated_at,
        document=_task_document_response(row),
        owner=AdminOwnerResponse(
            id=row.owner_id,
            email=row.owner_email,
            name=row.owner_name,
            role=row.owner_role,
        ),
    )


def _user_list_item_response(row) -> AdminUserListItemResponse:
    document_count = row.document_count or 0

    return AdminUserListItemResponse(
        id=row.user_id,
        name=row.name,
        email=row.email,
        role=row.role,
        document_count=document_count,
        upload_count=document_count,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _user_document_response(document: Document) -> AdminUserDocumentResponse:
    return AdminUserDocumentResponse(
        id=document.id,
        file_name=document.file_name,
        status=document.status,
        upload_at=document.upload_at,
    )


def _apply_document_filters(
    query,
    status: str | None,
    owner_id: UUID | None,
    search: str | None,
    uploaded_from: date | None,
    uploaded_to: date | None,
):
    if status:
        query = query.filter(Document.status == status)

    if owner_id:
        query = query.filter(Document.user_id == owner_id)

    if search:
        keyword = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Document.file_name.ilike(keyword),
                Document.category.ilike(keyword),
                User.name.ilike(keyword),
                User.email.ilike(keyword),
            )
        )

    if uploaded_from:
        query = query.filter(Document.upload_at >= _date_start(uploaded_from))

    if uploaded_to:
        query = query.filter(Document.upload_at <= _date_end(uploaded_to))

    return query


def _apply_task_filters(
    query,
    status: str | None,
    task_type: str | None,
    stage: str | None,
    document_id: UUID | None,
    owner_id: UUID | None,
    search: str | None,
    created_from: date | None,
    created_to: date | None,
):
    if status:
        query = query.filter(TaskTracker.status == status)

    if task_type:
        query = query.filter(TaskTracker.task_type == task_type)

    if stage:
        query = query.filter(TaskTracker.stage == stage)

    if document_id:
        query = query.filter(TaskTracker.document_id == document_id)

    if owner_id:
        query = query.filter(Document.user_id == owner_id)

    if search:
        keyword = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Document.file_name.ilike(keyword),
                User.name.ilike(keyword),
                User.email.ilike(keyword),
                TaskTracker.message.ilike(keyword),
                TaskTracker.error_message.ilike(keyword),
            )
        )

    if created_from:
        query = query.filter(TaskTracker.created_at >= _date_start(created_from))

    if created_to:
        query = query.filter(TaskTracker.created_at <= _date_end(created_to))

    return query


def _apply_user_filters(
    query,
    q: str | None,
    role: str | None,
):
    if q:
        search_text = q.strip()
        if search_text:
            keyword = f"%{search_text}%"
            query = query.filter(
                or_(
                    User.name.ilike(keyword),
                    User.email.ilike(keyword),
                )
            )

    if role:
        query = query.filter(User.role == role)

    return query


def _sort_expression(sort_by: str, sort_order: str):
    sort_columns = {
        "upload_at": Document.upload_at,
        "updated_at": Document.updated_at,
        "file_name": Document.file_name,
        "file_size": Document.file_size,
        "page_count": Document.page_count,
        "status": Document.status,
    }
    column = sort_columns.get(sort_by, Document.updated_at)

    if sort_order.lower() == "asc":
        return column.asc()

    return column.desc()


def _task_sort_expression(sort_by: str, sort_order: str):
    sort_columns = {
        "created_at": TaskTracker.created_at,
        "updated_at": TaskTracker.updated_at,
        "started_at": TaskTracker.started_at,
        "completed_at": TaskTracker.completed_at,
        "progress": TaskTracker.progress,
        "status": TaskTracker.status,
        "task_type": TaskTracker.task_type,
    }
    column = sort_columns.get(sort_by, TaskTracker.updated_at)

    if sort_order.lower() == "asc":
        return column.asc()

    return column.desc()


def _user_sort_expression(sort_by: str, sort_order: str, document_count_column):
    sort_columns = {
        "created_at": User.created_at,
        "updated_at": User.updated_at,
        "name": User.name,
        "email": User.email,
        "role": User.role,
        "document_count": document_count_column,
        "upload_count": document_count_column,
    }
    column = sort_columns.get(sort_by, User.created_at)

    if sort_order.lower() == "asc":
        return column.asc()

    return column.desc()


def _table_has_column(db: Session, table_name: str, column_name: str) -> bool:
    inspector = inspect(db.bind)
    return any(
        column["name"] == column_name
        for column in inspector.get_columns(table_name)
    )


def get_user_stats(db: Session) -> UserStatsResponse:
    today_start, today_end = _today_bounds()

    total_users = db.query(func.count(User.id)).scalar() or 0
    admin_users = (
        db.query(func.count(User.id))
        .filter(User.role == UserRole.ADMIN)
        .scalar()
        or 0
    )
    today_users = (
        db.query(func.count(User.id))
        .filter(
            User.created_at >= today_start,
            User.created_at <= today_end,
        )
        .scalar()
        or 0
    )

    return UserStatsResponse(
        total_users=total_users,
        admin_users=admin_users,
        today_users=today_users,
    )


def get_document_stats(db: Session) -> DocumentStatsResponse:
    today_start, today_end = _today_bounds()

    total = db.query(func.count(Document.id)).scalar() or 0
    uploaded_today = (
        db.query(func.count(Document.id))
        .filter(
            Document.upload_at >= today_start,
            Document.upload_at <= today_end,
        )
        .scalar()
        or 0
    )
    by_status = _fill_counts(
        _count_by(db, Document, Document.status),
        [
            DocumentStatus.PENDING,
            DocumentStatus.PROCESSING,
            DocumentStatus.REVIEW_REQUIRED,
            DocumentStatus.COMPLETED,
            DocumentStatus.FAILED,
        ],
    )

    return DocumentStatsResponse(
        total=total,
        uploaded_today=uploaded_today,
        by_status=by_status,
    )


def get_task_stats(db: Session) -> TaskStatsResponse:
    total = db.query(func.count(TaskTracker.id)).scalar() or 0
    by_status = _fill_counts(
        _count_by(db, TaskTracker, TaskTracker.status),
        [
            TaskStatus.PENDING,
            TaskStatus.PROCESSING,
            TaskStatus.COMPLETED,
            TaskStatus.FAILED,
        ],
    )
    by_type = _fill_counts(
        _count_by(db, TaskTracker, TaskTracker.task_type),
        [
            TaskType.OCR,
            TaskType.SUMMARY,
            TaskType.EMBEDDING,
            TaskType.RAG_INDEXING,
        ],
    )

    return TaskStatsResponse(
        total=total,
        by_status=by_status,
        by_type=by_type,
    )


def get_recent_events(db: Session, limit: int = 10) -> list[RecentEventResponse]:
    tasks = (
        db.query(TaskTracker)
        .options(joinedload(TaskTracker.document))
        .order_by(TaskTracker.updated_at.desc())
        .limit(limit)
        .all()
    )

    events = []
    for task in tasks:
        document_name = task.document.file_name if task.document else None
        task_label = task.task_type or "TASK"
        status_label = task.status or "UNKNOWN"
        message = task.message or task.error_message or f"{task_label} task is {status_label}"

        events.append(
            RecentEventResponse(
                id=task.id,
                event_type="TASK",
                message=message,
                occurred_at=task.updated_at,
                document_id=task.document_id,
                document_name=document_name,
                task_type=task.task_type,
                status=task.status,
            )
        )

    return events


def get_dashboard_summary(db: Session) -> AdminDashboardSummaryResponse:
    return AdminDashboardSummaryResponse(
        users=get_user_stats(db),
        documents=get_document_stats(db),
        tasks=get_task_stats(db),
        recent_events=get_recent_events(db),
    )


def _user_document_count_subquery(db: Session):
    return (
        db.query(
            Document.user_id.label("user_id"),
            func.count(Document.id).label("document_count"),
        )
        .group_by(Document.user_id)
        .subquery()
    )


def list_admin_users(
    db: Session,
    q: str | None = None,
    role: str | None = None,
    page: int = 1,
    limit: int = 20,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> AdminUserListResponse:
    page = max(page, 1)
    limit = min(max(limit, 1), 100)

    count_query = db.query(func.count(User.id))
    count_query = _apply_user_filters(
        count_query,
        q=q,
        role=role,
    )
    total = count_query.scalar() or 0

    document_counts = _user_document_count_subquery(db)
    document_count_column = func.coalesce(document_counts.c.document_count, 0)
    query = (
        db.query(
            User.id.label("user_id"),
            User.name.label("name"),
            User.email.label("email"),
            User.role.label("role"),
            User.created_at.label("created_at"),
            User.updated_at.label("updated_at"),
            document_count_column.label("document_count"),
        )
        .outerjoin(document_counts, document_counts.c.user_id == User.id)
    )
    query = _apply_user_filters(
        query,
        q=q,
        role=role,
    )
    rows = (
        query.order_by(_user_sort_expression(sort_by, sort_order, document_count_column), User.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return AdminUserListResponse(
        items=[_user_list_item_response(row) for row in rows],
        pagination=AdminPaginationResponse(
            page=page,
            limit=limit,
            total=total,
            total_pages=ceil(total / limit) if total else 0,
        ),
    )


def get_admin_user_detail(
    db: Session,
    user_id: UUID,
) -> AdminUserDetailResponse | None:
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        return None

    documents = (
        db.query(Document)
        .filter(Document.user_id == user.id)
        .order_by(Document.upload_at.desc(), Document.id.desc())
        .all()
    )
    document_count = len(documents)
    recent_task_rows = (
        _base_task_query(db)
        .filter(User.id == user.id)
        .order_by(TaskTracker.updated_at.desc(), TaskTracker.id.desc())
        .limit(10)
        .all()
    )

    return AdminUserDetailResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        document_count=document_count,
        upload_count=document_count,
        created_at=user.created_at,
        updated_at=user.updated_at,
        documents=[_user_document_response(document) for document in documents],
        recent_tasks=[_task_list_item_response(row) for row in recent_task_rows],
    )


def list_admin_documents(
    db: Session,
    page: int = 1,
    limit: int = 20,
    status: str | None = None,
    owner_id: UUID | None = None,
    search: str | None = None,
    uploaded_from: date | None = None,
    uploaded_to: date | None = None,
    sort_by: str = "updated_at",
    sort_order: str = "desc",
) -> AdminDocumentListResponse:
    page = max(page, 1)
    limit = min(max(limit, 1), 100)

    count_query = db.query(func.count(Document.id)).join(User)
    count_query = _apply_document_filters(
        count_query,
        status=status,
        owner_id=owner_id,
        search=search,
        uploaded_from=uploaded_from,
        uploaded_to=uploaded_to,
    )
    total = count_query.scalar() or 0

    latest_task = _build_latest_task_query(db)
    query = (
        db.query(
            Document.id.label("document_id"),
            Document.file_name.label("file_name"),
            Document.status.label("document_status"),
            Document.category.label("category"),
            Document.file_size.label("file_size"),
            Document.page_count.label("page_count"),
            Document.selected_embedding_model.label("selected_embedding_model"),
            Document.upload_at.label("upload_at"),
            Document.process_at.label("process_at"),
            Document.created_at.label("document_created_at"),
            Document.updated_at.label("document_updated_at"),
            User.id.label("owner_id"),
            User.email.label("owner_email"),
            User.name.label("owner_name"),
            User.role.label("owner_role"),
            latest_task.c.id.label("task_id"),
            latest_task.c.task_type.label("task_type"),
            latest_task.c.status.label("task_status"),
            latest_task.c.stage.label("task_stage"),
            latest_task.c.progress.label("task_progress"),
            latest_task.c.message.label("task_message"),
            latest_task.c.error_message.label("task_error_message"),
            latest_task.c.started_at.label("task_started_at"),
            latest_task.c.completed_at.label("task_completed_at"),
            latest_task.c.created_at.label("task_created_at"),
            latest_task.c.updated_at.label("task_updated_at"),
        )
        .join(User)
        .outerjoin(
            latest_task,
            and_(
                latest_task.c.document_id == Document.id,
                latest_task.c.row_number == 1,
            ),
        )
    )
    query = _apply_document_filters(
        query,
        status=status,
        owner_id=owner_id,
        search=search,
        uploaded_from=uploaded_from,
        uploaded_to=uploaded_to,
    )
    rows = (
        query.order_by(_sort_expression(sort_by, sort_order), Document.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return AdminDocumentListResponse(
        items=[_document_list_item_response(row) for row in rows],
        pagination=AdminPaginationResponse(
            page=page,
            limit=limit,
            total=total,
            total_pages=ceil(total / limit) if total else 0,
        ),
    )


def get_admin_document_detail(
    db: Session,
    document_id: UUID,
) -> AdminDocumentDetailResponse | None:
    document = (
        db.query(Document)
        .options(joinedload(Document.user))
        .filter(Document.id == document_id)
        .first()
    )

    if document is None:
        return None

    latest_task = (
        db.query(TaskTracker)
        .filter(TaskTracker.document_id == document.id)
        .order_by(TaskTracker.updated_at.desc(), TaskTracker.id.desc())
        .first()
    )
    chunk_count = (
        db.query(func.count(DocumentChunk.id))
        .filter(DocumentChunk.document_id == document.id)
        .scalar()
        or 0
    )
    keywords = []
    if _table_has_column(db, DocumentChunk.__tablename__, "keywords"):
        chunk_keywords = (
            db.query(DocumentChunk.keywords)
            .filter(DocumentChunk.document_id == document.id)
            .order_by(DocumentChunk.chunk_index.asc())
            .all()
        )

        for row_keywords, in chunk_keywords:
            for keyword in row_keywords or []:
                if keyword and keyword not in keywords:
                    keywords.append(keyword)

    return AdminDocumentDetailResponse(
        id=document.id,
        file_name=document.file_name,
        status=document.status,
        category=document.category,
        file_size=document.file_size,
        page_count=document.page_count,
        selected_embedding_model=document.selected_embedding_model,
        upload_at=document.upload_at,
        process_at=document.process_at,
        created_at=document.created_at,
        updated_at=document.updated_at,
        owner=_owner_response(document.user),
        latest_task=AdminLatestTaskResponse(
            id=latest_task.id,
            task_type=latest_task.task_type,
            status=latest_task.status,
            stage=latest_task.stage,
            progress=latest_task.progress,
            message=latest_task.message,
            error_message=latest_task.error_message,
            started_at=latest_task.started_at,
            completed_at=latest_task.completed_at,
            created_at=latest_task.created_at,
            updated_at=latest_task.updated_at,
        )
        if latest_task
        else None,
        summary=document.summary,
        chunk_count=chunk_count,
        keywords=keywords,
    )


def _base_task_query(db: Session):
    return (
        db.query(
            TaskTracker.id.label("task_id"),
            TaskTracker.task_type.label("task_type"),
            TaskTracker.status.label("task_status"),
            TaskTracker.stage.label("task_stage"),
            TaskTracker.progress.label("task_progress"),
            TaskTracker.message.label("task_message"),
            TaskTracker.error_message.label("task_error_message"),
            TaskTracker.started_at.label("task_started_at"),
            TaskTracker.completed_at.label("task_completed_at"),
            TaskTracker.created_at.label("task_created_at"),
            TaskTracker.updated_at.label("task_updated_at"),
            Document.id.label("document_id"),
            Document.file_name.label("file_name"),
            Document.status.label("document_status"),
            Document.category.label("category"),
            Document.upload_at.label("upload_at"),
            Document.updated_at.label("document_updated_at"),
            User.id.label("owner_id"),
            User.email.label("owner_email"),
            User.name.label("owner_name"),
            User.role.label("owner_role"),
        )
        .join(Document, TaskTracker.document_id == Document.id)
        .join(User, Document.user_id == User.id)
    )


def list_admin_tasks(
    db: Session,
    page: int = 1,
    limit: int = 20,
    status: str | None = None,
    task_type: str | None = None,
    stage: str | None = None,
    document_id: UUID | None = None,
    owner_id: UUID | None = None,
    search: str | None = None,
    created_from: date | None = None,
    created_to: date | None = None,
    sort_by: str = "updated_at",
    sort_order: str = "desc",
) -> AdminTaskListResponse:
    page = max(page, 1)
    limit = min(max(limit, 1), 100)

    count_query = (
        db.query(func.count(TaskTracker.id))
        .join(Document, TaskTracker.document_id == Document.id)
        .join(User, Document.user_id == User.id)
    )
    count_query = _apply_task_filters(
        count_query,
        status=status,
        task_type=task_type,
        stage=stage,
        document_id=document_id,
        owner_id=owner_id,
        search=search,
        created_from=created_from,
        created_to=created_to,
    )
    total = count_query.scalar() or 0

    query = _base_task_query(db)
    query = _apply_task_filters(
        query,
        status=status,
        task_type=task_type,
        stage=stage,
        document_id=document_id,
        owner_id=owner_id,
        search=search,
        created_from=created_from,
        created_to=created_to,
    )
    rows = (
        query.order_by(_task_sort_expression(sort_by, sort_order), TaskTracker.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return AdminTaskListResponse(
        items=[_task_list_item_response(row) for row in rows],
        pagination=AdminPaginationResponse(
            page=page,
            limit=limit,
            total=total,
            total_pages=ceil(total / limit) if total else 0,
        ),
    )


def get_admin_task_detail(
    db: Session,
    task_id: UUID,
) -> AdminTaskDetailResponse | None:
    row = (
        _base_task_query(db)
        .filter(TaskTracker.id == task_id)
        .first()
    )

    if row is None:
        return None

    item = _task_list_item_response(row)
    return AdminTaskDetailResponse(**item.dict())
