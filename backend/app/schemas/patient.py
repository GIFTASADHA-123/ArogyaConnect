from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class PatientBase(BaseModel):
    patient_code: str
    full_name: str
    age: int
    gender: str
    phone: str | None = None
    blood_group: str | None = None
    admission_date: date
    diagnosis: str | None = None
    medical_conditions: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None


class PatientResponse(PatientBase):
    id: int
    is_active: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class PatientStatusResponse(BaseModel):
    patient_id: int
    patient_code: str
    condition: str
    severity: str
    last_reading_at: datetime | None = None