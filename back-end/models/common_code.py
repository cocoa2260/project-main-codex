import uuid

from sqlalchemy import Boolean
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import UniqueConstraint
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID

from db.database import Base


class CommonCode(Base):
    __tablename__ = "common_codes"
    __table_args__ = (
        UniqueConstraint("group_code", "code", name="uq_common_codes_group_code_code"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    group_code = Column(String(100), nullable=False, index=True)
    code = Column(String(100), nullable=False, index=True)
    code_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
