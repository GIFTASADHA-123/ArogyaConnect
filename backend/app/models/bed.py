from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String
)

from sqlalchemy.sql import func

from app.database.database import Base


class Bed(Base):

    __tablename__ = "beds"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    bed_code = Column(
        String(20),
        unique=True,
        nullable=False,
        index=True
    )

    patient_id = Column(
        Integer,
        ForeignKey(
            "patients.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )

    ward = Column(
        String(50),
        nullable=False
    )

    status = Column(
        String(20),
        nullable=False,
        default="occupied"
    )

    created_at = Column(
        DateTime,
        server_default=func.current_timestamp()
    )