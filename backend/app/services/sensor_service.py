from datetime import datetime

from sqlalchemy.orm import Session

from app.models.device import Device
from app.models.patient import Patient
from app.models.sensor_reading import SensorReading
from app.schemas.sensor import SensorReadingCreate


# =========================================================
# CREATE SENSOR READING
# =========================================================

def create_sensor_reading(
    db: Session,
    data: SensorReadingCreate
):

    # -----------------------------------------------------
    # CHECK PATIENT
    # -----------------------------------------------------

    patient = (
        db.query(Patient)
        .filter(
            Patient.id == data.patient_id
        )
        .first()
    )

    if patient is None:
        return None, "Patient not found"


    # -----------------------------------------------------
    # CHECK DEVICE
    # -----------------------------------------------------

    device = (
        db.query(Device)
        .filter(
            Device.id == data.device_id
        )
        .first()
    )

    if device is None:
        return None, "Device not found"


    # -----------------------------------------------------
    # RECORDING TIME
    # -----------------------------------------------------

    recorded_at = (
        data.recorded_at
        or datetime.now()
    )


    # -----------------------------------------------------
    # CREATE SENSOR READING
    # -----------------------------------------------------

    reading = SensorReading(

        patient_id=data.patient_id,

        device_id=data.device_id,

        temperature=data.temperature,

        gyro_x=data.gyro_x,

        gyro_y=data.gyro_y,

        gyro_z=data.gyro_z,

        force_fall=data.force_fall,

        force_position=data.force_position,

        urine_distance=data.urine_distance,

        iv_distance=data.iv_distance,

        fall_detected=data.fall_detected,

        same_position=data.same_position,

        position_duration_seconds=
            data.position_duration_seconds,

        position_label=
            data.position_label,

        buzzer_status=
            data.buzzer_status,

        recorded_at=recorded_at
    )


    # -----------------------------------------------------
    # ADD READING
    # -----------------------------------------------------

    db.add(reading)


    # -----------------------------------------------------
    # UPDATE DEVICE STATUS
    # -----------------------------------------------------

    device.is_active = True

    device.last_seen_at = recorded_at


    # -----------------------------------------------------
    # SAVE
    # -----------------------------------------------------

    try:

        db.commit()

        db.refresh(reading)

    except Exception as error:

        db.rollback()

        return None, (
            f"Unable to save sensor reading: {error}"
        )


    return reading, None