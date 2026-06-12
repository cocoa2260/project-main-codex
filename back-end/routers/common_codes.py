from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy.orm import Session

from db.session import get_db
from models.common_code import CommonCode
from schemas.common_code import CommonCodeResponse

router = APIRouter()


@router.get("", response_model=list[CommonCodeResponse])
def list_common_codes(
    group_code: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(CommonCode).filter(CommonCode.is_active.is_(True))

    if group_code:
        query = query.filter(CommonCode.group_code == group_code)

    return query.order_by(CommonCode.group_code.asc(), CommonCode.sort_order.asc()).all()


@router.get("/{group_code}", response_model=list[CommonCodeResponse])
def list_common_codes_by_group(
    group_code: str,
    db: Session = Depends(get_db),
):
    return (
        db.query(CommonCode)
        .filter(
            CommonCode.group_code == group_code,
            CommonCode.is_active.is_(True),
        )
        .order_by(CommonCode.sort_order.asc())
        .all()
    )
