from datetime import date, datetime, time
from decimal import Decimal
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query
)

from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.patient import Patient
from app.models.sensor_reading import SensorReading


router = APIRouter(
    tags=["Sensors"]
)


# =========================================================
# NUMBER HELPER
# =========================================================

def number_value(value):

    if value is None:
        return None

    if isinstance(value, Decimal):
        return float(value)

    return value


# =========================================================
# SERIALIZE SENSOR READING
# =========================================================

def serialize_reading(
    reading: SensorReading
):

    temperature = number_value(
        reading.temperature
    )

    gyro_x = number_value(
        reading.gyro_x
    )

    gyro_y = number_value(
        reading.gyro_y
    )

    gyro_z = number_value(
        reading.gyro_z
    )

    force_fall = number_value(
        reading.force_fall
    )

    force_position = number_value(
        reading.force_position
    )

    urine_distance = number_value(
        reading.urine_distance
    )

    iv_distance = number_value(
        reading.iv_distance
    )

    fall_detected = bool(
        reading.fall_detected
    )

    same_position = bool(
        reading.same_position
    )

    buzzer_status = bool(
        reading.buzzer_status
    )

    position_label = reading.position_label

    position_duration = (
        reading.position_duration_seconds
    )


    return {

        "id":
            reading.id,

        "patient_id":
            reading.patient_id,

        "device_id":
            reading.device_id,

        # -------------------------------------------------
        # TEMPERATURE
        # -------------------------------------------------

        "temperature":
            temperature,

        # -------------------------------------------------
        # GYROSCOPE
        # -------------------------------------------------

        "gyro_x":
            gyro_x,

        "gyro_y":
            gyro_y,

        "gyro_z":
            gyro_z,

        # Frontend compatibility
        "gyroX":
            gyro_x,

        "gyroY":
            gyro_y,

        "gyroZ":
            gyro_z,

        # -------------------------------------------------
        # FORCE SENSORS
        # -------------------------------------------------

        "force_fall":
            force_fall,

        "force_position":
            force_position,

        # -------------------------------------------------
        # ULTRASONIC SENSORS
        # -------------------------------------------------

        "urine_distance":
            urine_distance,

        "iv_distance":
            iv_distance,

        # Frontend compatibility
        "urineDistance":
            urine_distance,

        "ivDistance":
            iv_distance,

        # -------------------------------------------------
        # POSITION
        # -------------------------------------------------

        "position_status":
            position_label,

        "position_label":
            position_label,

        "position_duration_seconds":
            position_duration,

        "positionDurationSeconds":
            position_duration,

        # -------------------------------------------------
        # FALL
        # -------------------------------------------------

        "fall_detected":
            fall_detected,

        "fallDetected":
            fall_detected,

        # -------------------------------------------------
        # SAME POSITION
        # -------------------------------------------------

        "same_position":
            same_position,

        "samePosition":
            same_position,

        # -------------------------------------------------
        # BUZZER
        # -------------------------------------------------

        "buzzer_status":
            buzzer_status,

        "buzzerStatus":
            buzzer_status,

        # -------------------------------------------------
        # TIMESTAMP
        # -------------------------------------------------

        "recorded_at":
            (
                reading.recorded_at.isoformat()
                if reading.recorded_at
                else None
            )
    }


# =========================================================
# GET PATIENT OR 404
# =========================================================

def get_patient_or_404(
    db: Session,
    patient_id: int
):

    patient = (
        db.query(Patient)
        .filter(
            Patient.id == patient_id
        )
        .first()
    )

    if patient is None:

        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    return patient


# =========================================================
# LATEST SENSOR READING
# =========================================================

@router.get(
    "/patient/{patient_id}/latest"
)
def get_latest_reading(

    patient_id: int,

    db: Session = Depends(
        get_db
    )

):

    get_patient_or_404(
        db,
        patient_id
    )


    reading = (
        db.query(
            SensorReading
        )
        .filter(
            SensorReading.patient_id ==
            patient_id
        )
        .order_by(
            SensorReading.recorded_at.desc()
        )
        .first()
    )


    if reading is None:

        return {

            "has_data":
                False,

            "patient_id":
                patient_id,

            "reading":
                None
        }


    return {

        "has_data":
            True,

        "patient_id":
            patient_id,

        "reading":
            serialize_reading(
                reading
            )
    }


# =========================================================
# TODAY'S READINGS
# =========================================================

@router.get(
    "/patient/{patient_id}/today"
)
def get_today_readings(

    patient_id: int,

    db: Session = Depends(
        get_db
    )

):

    get_patient_or_404(
        db,
        patient_id
    )


    today = date.today()


    start_datetime = datetime.combine(
        today,
        time.min
    )


    end_datetime = datetime.combine(
        today,
        time.max
    )


    readings = (
        db.query(
            SensorReading
        )
        .filter(
            SensorReading.patient_id ==
            patient_id
        )
        .filter(
            SensorReading.recorded_at >=
            start_datetime
        )
        .filter(
            SensorReading.recorded_at <=
            end_datetime
        )
        .order_by(
            SensorReading.recorded_at.asc()
        )
        .all()
    )


    return {

        "patient_id":
            patient_id,

        "date":
            today.isoformat(),

        "count":
            len(readings),

        "readings":
            [
                serialize_reading(
                    reading
                )
                for reading in readings
            ]
    }


# =========================================================
# SENSOR HISTORY
# =========================================================

@router.get(
    "/patient/{patient_id}/history"
)
def get_sensor_history(

    patient_id: int,

    start_date: Optional[date] = Query(
        None
    ),

    end_date: Optional[date] = Query(
        None
    ),

    limit: int = Query(
        5000,
        ge=1,
        le=20000
    ),

    db: Session = Depends(
        get_db
    )

):

    get_patient_or_404(
        db,
        patient_id
    )


    query = (
        db.query(
            SensorReading
        )
        .filter(
            SensorReading.patient_id ==
            patient_id
        )
    )


    # -----------------------------------------------------
    # START DATE
    # -----------------------------------------------------

    if start_date:

        start_datetime = datetime.combine(
            start_date,
            time.min
        )

        query = query.filter(
            SensorReading.recorded_at >=
            start_datetime
        )


    # -----------------------------------------------------
    # END DATE
    # -----------------------------------------------------

    if end_date:

        end_datetime = datetime.combine(
            end_date,
            time.max
        )

        query = query.filter(
            SensorReading.recorded_at <=
            end_datetime
        )


    # -----------------------------------------------------
    # GET READINGS
    # -----------------------------------------------------

    readings = (
        query
        .order_by(
            SensorReading.recorded_at.asc()
        )
        .limit(limit)
        .all()
    )


    return {

        "patient_id":
            patient_id,

        "start_date":
            (
                start_date.isoformat()
                if start_date
                else None
            ),

        "end_date":
            (
                end_date.isoformat()
                if end_date
                else None
            ),

        "count":
            len(readings),

        "readings":
            [
                serialize_reading(
                    reading
                )
                for reading in readings
            ]
    }


# =========================================================
# CURRENT SENSOR STATUS
# =========================================================

@router.get(
    "/patient/{patient_id}/status"
)
def get_patient_sensor_status(

    patient_id: int,

    db: Session = Depends(
        get_db
    )

):

    patient = get_patient_or_404(
        db,
        patient_id
    )


    reading = (
        db.query(
            SensorReading
        )
        .filter(
            SensorReading.patient_id ==
            patient_id
        )
        .order_by(
            SensorReading.recorded_at.desc()
        )
        .first()
    )


    # -----------------------------------------------------
    # NO DATA
    # -----------------------------------------------------

    if reading is None:

        return {

            "patient_id":
                patient.id,

            "patient_code":
                patient.patient_code,

            "patient_name":
                patient.full_name,

            "has_data":
                False,

            "monitoring_status":
                "no_data",

            "last_update":
                None,

            "temperature":
                None,

            "fall_detected":
                False,

            "fallDetected":
                False,

            "position_status":
                None,

            "position_label":
                None,

            "position_duration_seconds":
                None,

            "positionDurationSeconds":
                None,

            "urine_distance":
                None,

            "urineDistance":
                None,

            "iv_distance":
                None,

            "ivDistance":
                None,

            "gyro_x":
                None,

            "gyro_y":
                None,

            "gyro_z":
                None,

            "gyroX":
                None,

            "gyroY":
                None,

            "gyroZ":
                None,

            "same_position":
                False,

            "samePosition":
                False,

            "buzzer_status":
                False,

            "buzzerStatus":
                False
        }


    # -----------------------------------------------------
    # DATA AVAILABLE
    # -----------------------------------------------------

    return {

        "patient_id":
            patient.id,

        "patient_code":
            patient.patient_code,

        "patient_name":
            patient.full_name,

        "has_data":
            True,

        "monitoring_status":
            "active",

        "last_update":
            (
                reading.recorded_at.isoformat()
                if reading.recorded_at
                else None
            ),

        "temperature":
            number_value(
                reading.temperature
            ),

        "fall_detected":
            bool(
                reading.fall_detected
            ),

        "fallDetected":
            bool(
                reading.fall_detected
            ),

        "position_status":
            reading.position_label,

        "position_label":
            reading.position_label,

        "position_duration_seconds":
            reading.position_duration_seconds,

        "positionDurationSeconds":
            reading.position_duration_seconds,

        "urine_distance":
            number_value(
                reading.urine_distance
            ),

        "urineDistance":
            number_value(
                reading.urine_distance
            ),

        "iv_distance":
            number_value(
                reading.iv_distance
            ),

        "ivDistance":
            number_value(
                reading.iv_distance
            ),

        "gyro_x":
            number_value(
                reading.gyro_x
            ),

        "gyro_y":
            number_value(
                reading.gyro_y
            ),

        "gyro_z":
            number_value(
                reading.gyro_z
            ),

        "gyroX":
            number_value(
                reading.gyro_x
            ),

        "gyroY":
            number_value(
                reading.gyro_y
            ),

        "gyroZ":
            number_value(
                reading.gyro_z
            ),

        "same_position":
            bool(
                reading.same_position
            ),

        "samePosition":
            bool(
                reading.same_position
            ),

        "buzzer_status":
            bool(
                reading.buzzer_status
            ),

        "buzzerStatus":
            bool(
                reading.buzzer_status
            )
    }


# =========================================================
# ALL SENSOR READINGS
# =========================================================

@router.get(
    "/readings"
)
def get_readings(

    patient_id: Optional[int] = Query(
        None
    ),

    limit: int = Query(
        100,
        ge=1,
        le=5000
    ),

    db: Session = Depends(
        get_db
    )

):

    query = db.query(
        SensorReading
    )


    # -----------------------------------------------------
    # OPTIONAL PATIENT FILTER
    # -----------------------------------------------------

    if patient_id is not None:

        get_patient_or_404(
            db,
            patient_id
        )

        query = query.filter(
            SensorReading.patient_id ==
            patient_id
        )


    # -----------------------------------------------------
    # GET READINGS
    # -----------------------------------------------------

    readings = (
        query
        .order_by(
            SensorReading.recorded_at.desc()
        )
        .limit(limit)
        .all()
    )


    return {

        "count":
            len(readings),

        "readings":
            [
                serialize_reading(
                    reading
                )
                for reading in readings
            ]
    }


# =========================================================
# FUTURE REAL-TIME SENSOR INPUT
# =========================================================

@router.post(
    "/readings"
)
def create_sensor_reading(

    data: dict,

    db: Session = Depends(
        get_db
    )

):

    # -----------------------------------------------------
    # REQUIRED IDS
    # -----------------------------------------------------

    patient_id = data.get(
        "patient_id"
    )


    device_id = data.get(
        "device_id"
    )


    if patient_id is None:

        raise HTTPException(
            status_code=400,
            detail="patient_id is required"
        )


    if device_id is None:

        raise HTTPException(
            status_code=400,
            detail="device_id is required"
        )


    # -----------------------------------------------------
    # VALIDATE IDS
    # -----------------------------------------------------

    try:

        patient_id = int(
            patient_id
        )

        device_id = int(
            device_id
        )

    except (TypeError, ValueError):

        raise HTTPException(
            status_code=400,
            detail=(
                "patient_id and device_id "
                "must be valid integers"
            )
        )


    # -----------------------------------------------------
    # VERIFY PATIENT
    # -----------------------------------------------------

    get_patient_or_404(
        db,
        patient_id
    )


    try:

        # -------------------------------------------------
        # TIMESTAMP
        # -------------------------------------------------

        if data.get(
            "recorded_at"
        ):

            recorded_at = datetime.fromisoformat(
                data["recorded_at"]
            )

        else:

            recorded_at = datetime.now()


        # -------------------------------------------------
        # SENSOR VALUES
        # -------------------------------------------------

        temperature = data.get(
            "temperature"
        )

        gyro_x = data.get(
            "gyro_x"
        )

        gyro_y = data.get(
            "gyro_y"
        )

        gyro_z = data.get(
            "gyro_z"
        )

        force_fall = data.get(
            "force_fall"
        )

        force_position = data.get(
            "force_position"
        )

        urine_distance = data.get(
            "urine_distance"
        )

        iv_distance = data.get(
            "iv_distance"
        )


        # -------------------------------------------------
        # BOOLEAN VALUES
        # -------------------------------------------------

        fall_detected = bool(
            data.get(
                "fall_detected",
                False
            )
        )


        same_position = bool(
            data.get(
                "same_position",
                False
            )
        )


        position_duration = int(
            data.get(
                "position_duration_seconds",
                0
            )
            or 0
        )


        buzzer_status = bool(
            data.get(
                "buzzer_status",
                False
            )
        )


        # -------------------------------------------------
        # POSITION LABEL
        # -------------------------------------------------

        position_label = data.get(
            "position_label"
        )


        if position_label is None:

            position_label = data.get(
                "position_status"
            )


        # =================================================
        # ALERT / BUZZER CONDITION ENGINE
        # =================================================

        temperature_alert = (
            temperature is not None
            and float(temperature) > 35
        )


        gyro_alert = any(
            value is not None
            and abs(float(value)) >= 85
            for value in (
                gyro_x,
                gyro_y,
                gyro_z
            )
        )


        urine_alert = (
            urine_distance is not None
            and float(urine_distance) < 20
        )


        iv_alert = (
            iv_distance is not None
            and float(iv_distance) < 15
        )


        prolonged_position_alert = (
            same_position
            and position_duration >= 3600
        )


        # -------------------------------------------------
        # BUZZER ON IF ANY ALERT CONDITION IS TRUE
        # -------------------------------------------------

        if (
            temperature_alert
            or fall_detected
            or gyro_alert
            or urine_alert
            or iv_alert
            or prolonged_position_alert
        ):

            buzzer_status = True


        # =================================================
        # CREATE SENSOR READING
        # =================================================

        reading = SensorReading(

            patient_id=int(
                patient_id
            ),

            device_id=int(
                device_id
            ),

            temperature=temperature,

            gyro_x=gyro_x,

            gyro_y=gyro_y,

            gyro_z=gyro_z,

            force_fall=force_fall,

            force_position=force_position,

            urine_distance=urine_distance,

            iv_distance=iv_distance,

            fall_detected=fall_detected,

            same_position=same_position,

            position_duration_seconds=(
                position_duration
            ),

            position_label=(
                position_label
            ),

            buzzer_status=(
                buzzer_status
            ),

            recorded_at=(
                recorded_at
            )
        )


        # -------------------------------------------------
        # SAVE
        # -------------------------------------------------

        db.add(
            reading
        )

        db.commit()

        db.refresh(
            reading
        )


        # -------------------------------------------------
        # RESPONSE
        # -------------------------------------------------

        return {

            "success":
                True,

            "message":
                "Sensor reading saved successfully",

            "reading":
                serialize_reading(
                    reading
                )
        }


    except ValueError as error:

        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid sensor value: "
                f"{error}"
            )
        )


    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to save sensor reading: "
                f"{error}"
            )
        )