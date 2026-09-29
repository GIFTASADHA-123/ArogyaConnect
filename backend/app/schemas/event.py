from datetime import datetime

from pydantic import BaseModel


class PatientEventCreate(BaseModel):
    patient_id: int
    event_type: str
    title: str
    description: str | None = None
    severity: str = "normal"
    created_by: int | None = None


class PatientEventResponse(BaseModel):
    id: int

    patient_id: int

    event_type: str
    title: str
    description: str | None = None
    severity: str

    created_by: int | None = None

    created_at: datetime