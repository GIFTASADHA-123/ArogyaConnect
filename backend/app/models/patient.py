from sqlalchemy import Column, Date, DateTime, Integer, String
from sqlalchemy.sql import func

from app.database.database import Base


class Patient(Base):

    __tablename__ = "patients"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    patient_code = Column(
        String(20),
        unique=True,
        nullable=False,
        index=True
    )

    full_name = Column(
        String(120),
        nullable=False
    )

    age = Column(
        Integer,
        nullable=False
    )

    gender = Column(
        String(20),
        nullable=False
    )

    ward = Column(
        String(50),
        nullable=False
    )

    bed_number = Column(
        String(20),
        nullable=True
    )

    blood_group = Column(
        String(10),
        nullable=True
    )

    phone = Column(
        String(30),
        nullable=True
    )

    emergency_contact = Column(
        String(120),
        nullable=True
    )

    emergency_phone = Column(
        String(30),
        nullable=True
    )

    diagnosis = Column(
        String(255),
        nullable=False
    )

    doctor_name = Column(
        String(120),
        nullable=False
    )

    admission_date = Column(
        Date,
        nullable=True
    )

    status = Column(
        String(20),
        nullable=False,
        default="active"
    )

    created_at = Column(
        DateTime,
        server_default=func.current_timestamp()
    )


    @property
    def is_active(self):

        return (
            str(
                self.status or ""
            ).lower()
            == "active"
        )


    @property
    def medical_conditions(self):

        return self.diagnosis


    @property
    def emergency_contact_name(self):

        return self.emergency_contact


    @property
    def emergency_contact_phone(self):

        return self.emergency_phone


    @property
    def updated_at(self):

        return None