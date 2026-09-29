from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text
)

from sqlalchemy.sql import func

from app.database.database import Base


class Alert(Base):

    __tablename__ = "alerts"


    id = Column(
        BigInteger,
        primary_key=True,
        index=True
    )


    patient_id = Column(
        Integer,
        ForeignKey(
            "patients.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )


    alert_type = Column(
        String(50),
        nullable=False
    )


    severity = Column(
        String(20),
        nullable=False,
        default="warning"
    )


    message = Column(
        Text,
        nullable=False
    )


    sensor_value = Column(
        String(100),
        nullable=True
    )


    acknowledged = Column(
        Boolean,
        nullable=False,
        default=False
    )


    acknowledged_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )


    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
        index=True
    )


    acknowledged_at = Column(
        DateTime,
        nullable=True
    )