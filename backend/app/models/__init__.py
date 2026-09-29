"""
ArogyaConnect database models.

Import every SQLAlchemy model here so that all tables
are registered in the same SQLAlchemy metadata.

This is especially important for foreign keys such as:

sensor_readings.device_id
    -> devices.id

sensor_readings.patient_id
    -> patients.id

alerts.patient_id
    -> patients.id

alerts.device_id
    -> devices.id

patient_events.patient_id
    -> patients.id
"""


from app.models.user import User
from app.models.patient import Patient
from app.models.bed import Bed
from app.models.device import Device
from app.models.sensor_reading import SensorReading
from app.models.alert import Alert
from app.models.patient_event import PatientEvent


__all__ = [
    "User",
    "Patient",
    "Bed",
    "Device",
    "SensorReading",
    "Alert",
    "PatientEvent",
]