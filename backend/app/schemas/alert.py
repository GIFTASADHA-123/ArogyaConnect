from datetime import datetime

from pydantic import BaseModel


class AlertCreate(BaseModel):
    patient_id: int
    device_id: int | None = None
    alert_type: str
    severity: str
    message: str


class AlertResponse(BaseModel):
    id: int

    patient_id: int
    device_id: int | None = None

    alert_type: str
    severity: str
    message: str

    acknowledged: bool
    acknowledged_by: int | None = None
    acknowledged_at: datetime | None = None

    created_at: datetime


class AlertAcknowledgeRequest(BaseModel):
    user_id: int