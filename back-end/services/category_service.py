from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy import or_
from sqlalchemy.orm import Session

from models.category import Category
from models.document import Document
from models.document_category import DocumentCategory
from schemas.category import AdminCategoryStatsResponse
from schemas.category import CategoryResponse


LEGAL_CATEGORY_NAMES = [
    "민법",
    "형법",
    "민사소송법",
    "형사소송법",
    "상법",
    "행정법",
    "노동법",
    "조세법",
    "헌법",
    "지식재산권법",
    "개인정보보호법",
    "기타",
]

DEFAULT_CATEGORY_NAME = "기타"
LLM_CATEGORY_SOURCE = "LLM"


@dataclass(frozen=True)
class CategoryClassification:
    category: str
    confidence: float | None = None


def normalize_category_name(category_name: str | None) -> str:
    normalized = (category_name or "").strip()
    if normalized in LEGAL_CATEGORY_NAMES:
        return normalized

    return DEFAULT_CATEGORY_NAME


def normalize_confidence(confidence: float | int | str | None) -> float | None:
    if confidence is None:
        return None

    try:
        value = float(confidence)
    except (TypeError, ValueError):
        return None

    if value < 0:
        return 0.0
    if value > 1:
        return 1.0
    return round(value, 4)


def get_category_by_name(db: Session, category_name: str) -> Category | None:
    return (
        db.query(Category)
        .filter(
            Category.name == category_name,
            Category.is_active.is_(True),
        )
        .first()
    )


def list_active_categories(db: Session) -> list[CategoryResponse]:
    categories = (
        db.query(Category)
        .filter(Category.is_active.is_(True))
        .order_by(Category.sort_order.asc(), Category.name.asc())
        .all()
    )

    return [
        CategoryResponse(
            id=category.id,
            name=category.name,
        )
        for category in categories
    ]


def list_category_statistics(db: Session) -> list[AdminCategoryStatsResponse]:
    categories = (
        db.query(Category)
        .order_by(Category.sort_order.asc(), Category.name.asc())
        .all()
    )

    stats = []
    for category in categories:
        document_count = (
            db.query(func.count(func.distinct(Document.id)))
            .outerjoin(DocumentCategory, DocumentCategory.document_id == Document.id)
            .filter(
                or_(
                    DocumentCategory.category_id == category.id,
                    Document.category == category.name,
                )
            )
            .scalar()
            or 0
        )
        stats.append(
            AdminCategoryStatsResponse(
                id=category.id,
                name=category.name,
                document_count=document_count,
                is_active=category.is_active,
            )
        )

    return stats


def save_document_category(
    db: Session,
    document: Document,
    classification: CategoryClassification,
    source: str = LLM_CATEGORY_SOURCE,
) -> DocumentCategory | None:
    category_name = normalize_category_name(classification.category)
    category = get_category_by_name(db, category_name)
    if category is None and category_name != DEFAULT_CATEGORY_NAME:
        category = get_category_by_name(db, DEFAULT_CATEGORY_NAME)
    if category is None:
        return None

    confidence = normalize_confidence(classification.confidence)
    document.category = category.name

    document_category = (
        db.query(DocumentCategory)
        .filter(DocumentCategory.document_id == document.id)
        .first()
    )
    if document_category is None:
        document_category = DocumentCategory(document_id=document.id)
        db.add(document_category)

    document_category.category_id = category.id
    document_category.confidence = Decimal(str(confidence)) if confidence is not None else None
    document_category.source = source

    return document_category


def get_document_category_payload(document: Document) -> dict[str, str | float | None] | None:
    if not document.document_categories:
        if document.category:
            return {
                "name": document.category,
                "confidence": None,
            }
        return None

    document_category = document.document_categories[0]
    category = document_category.category
    if category is None:
        return None

    confidence = document_category.confidence
    return {
        "name": category.name,
        "confidence": float(confidence) if confidence is not None else None,
    }
