from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String
)

from sqlalchemy.sql import func

from app.database.database import Base


class SensorReading(Base):

    __tablename__ = "sensor_readings"


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


    device_id = Column(
        Integer,
        ForeignKey(
            "devices.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )


    temperature = Column(
        Float,
        nullable=True
    )


    gyro_x = Column(
        Float,
        nullable=True
    )


    gyro_y = Column(
        Float,
        nullable=True
    )


    gyro_z = Column(
        Float,
        nullable=True
    )


    force_fall = Column(
        Float,
        nullable=True
    )


    force_position = Column(
        Float,
        nullable=True
    )


    urine_distance = Column(
        Float,
        nullable=True
    )


    iv_distance = Column(
        Float,
        nullable=True
    )


    fall_detected = Column(
        Boolean,
        nullable=False,
        default=False
    )


    same_position = Column(
        Boolean,
        nullable=False,
        default=False
    )


    position_duration_seconds = Column(
        Integer,
        nullable=False,
        default=0
    )


    position_label = Column(
        String(50),
        nullable=True
    )


    buzzer_status = Column(
        Boolean,
        nullable=False,
        default=False
    )


    recorded_at = Column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
        index=True
    )