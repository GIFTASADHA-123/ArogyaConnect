from datetime import datetime

from pydantic import BaseModel


class SensorReadingCreate(BaseModel):
    patient_id: int
    device_id: int | None = None

    temperature: float | None = None

    gyro_x: float | None = None
    gyro_y: float | None = None
    gyro_z: float | None = None

    force_fall: float | None = None
    force_position: float | None = None

    urine_distance: float | None = None
    iv_distance: float | None = None

    position_status: str | None = None
    position_duration_seconds: int | None = None

    fall_detected: bool = False

    recorded_at: datetime | None = None


class SensorReadingResponse(BaseModel):
    id: int

    patient_id: int
    device_id: int | None = None

    temperature: float | None = None

    gyro_x: float | None = None
    gyro_y: float | None = None
    gyro_z: float | None = None

    force_fall: float | None = None
    force_position: float | None = None

    urine_distance: float | None = None
    iv_distance: float | None = None

    position_status: str | None = None
    position_duration_seconds: int | None = None

    fall_detected: bool

    recorded_at: datetime


class LatestSensorResponse(BaseModel):
    id: int
    patient_id: int
    device_id: int | None = None

    temperature: float | None = None

    gyro_x: float | None = None
    gyro_y: float | None = None
    gyro_z: float | None = None

    force_fall: float | None = None
    force_position: float | None = None

    urine_distance: float | None = None
    iv_distance: float | None = None

    position_status: str | None = None
    position_duration_seconds: int | None = None

    fall_detected: bool

    recorded_at: datetime


class PatientMonitoringStatus(BaseModel):
    patient_id: int
    patient_code: str
    patient_name: str

    condition: str
    severity: str

    latest_reading: LatestSensorResponse | None = None