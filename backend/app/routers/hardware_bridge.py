from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.sensor_reading import SensorReading
from app.models.alert import Alert
from app.models.device import Device


router = APIRouter(
    prefix="/api",
    tags=["Hardware Bridge"]
)


# ============================================================
# HARDWARE CONFIGURATION
# ============================================================

HARDWARE_PATIENT_ID = 1
HARDWARE_DEVICE_ID = 1


# ============================================================
# GENERAL ALERT THRESHOLDS
# ============================================================

TEMPERATURE_THRESHOLD = 35.0

GYRO_THRESHOLD = 85.0

URINE_DISTANCE_THRESHOLD = 20.0

IV_DISTANCE_THRESHOLD = 15.0


# ============================================================
# FALL DETECTION CONFIGURATION
# ============================================================

# ONLY FORCE 2 IS USED FOR FALL DETECTION

FALL_FORCE2_THRESHOLD = 200.0


# ============================================================
# SAME POSITION CONFIGURATION
# ============================================================

POSITION_VALUE_THRESHOLD = 100.0

POSITION_ALERT_DURATION_SECONDS = 60

POSITION_VALUE_TOLERANCE = 1.0


# ============================================================
# BOOLEAN HELPER
# ============================================================

def to_bool(value: Any) -> bool:

    if isinstance(value, bool):
        return value

    if isinstance(value, (int, float)):
        return value != 0

    if value is None:
        return False

    value = str(value).strip().lower()

    return value in {
        "1",
        "true",
        "yes",
        "on",
        "detected",
    }


# ============================================================
# FLOAT HELPER
# ============================================================

def to_float(
    value: Any,
    default: Optional[float] = None
) -> Optional[float]:

    if value is None:
        return default

    try:
        return float(value)

    except (
        TypeError,
        ValueError
    ):
        return default


# ============================================================
# CREATE ALERT
# ============================================================

def create_alert(
    db: Session,
    patient_id: int,
    alert_type: str,
    severity: str,
    message: str,
    sensor_value: Optional[str] = None
):

    alert = Alert(
        patient_id=patient_id,
        alert_type=alert_type,
        severity=severity,
        message=message,
        sensor_value=sensor_value,
        acknowledged=False,
    )

    db.add(alert)

    return alert


# ============================================================
# GET PREVIOUS READING
# ============================================================

def get_previous_reading(
    db: Session,
    patient_id: int,
    device_id: int
):

    return (
        db.query(SensorReading)
        .filter(
            SensorReading.patient_id == patient_id,
            SensorReading.device_id == device_id,
        )
        .order_by(
            SensorReading.recorded_at.desc(),
            SensorReading.id.desc(),
        )
        .first()
    )


# ============================================================
# SAME POSITION CALCULATION
# ============================================================

def calculate_position_state(
    previous_reading: Optional[SensorReading],
    current_value: Optional[float],
    current_time: datetime,
):

    if current_value is None:

        return (
            False,
            0,
            False
        )


    if current_value >= POSITION_VALUE_THRESHOLD:

        return (
            False,
            0,
            False
        )


    if previous_reading is None:

        return (
            True,
            0,
            False
        )


    previous_value = (
        previous_reading.force_position
    )


    if previous_value is None:

        return (
            True,
            0,
            False
        )


    value_difference = abs(
        current_value -
        previous_value
    )


    same_value = (
        value_difference <=
        POSITION_VALUE_TOLERANCE
    )


    if not same_value:

        return (
            False,
            0,
            False
        )


    previous_time = (
        previous_reading.recorded_at
    )


    if previous_time is None:

        return (
            True,
            0,
            False
        )


    elapsed_seconds = (
        current_time -
        previous_time
    ).total_seconds()


    if elapsed_seconds < 0:

        elapsed_seconds = 0


    previous_duration = (
        previous_reading.position_duration_seconds
        or 0
    )


    position_duration_seconds = (
        previous_duration +
        int(elapsed_seconds)
    )


    prolonged_position_alert = (
        position_duration_seconds >=
        POSITION_ALERT_DURATION_SECONDS
    )


    return (
        True,
        position_duration_seconds,
        prolonged_position_alert
    )


# ============================================================
# HARDWARE DATA ENDPOINT
# ============================================================

@router.post("/data")
def receive_hardware_data(
    data: dict,
    db: Session = Depends(get_db)
):

    # ========================================================
    # CURRENT TIME
    # ========================================================

    current_time = datetime.now()


    # ========================================================
    # PRINT RECEIVED ESP32 DATA
    # ========================================================

    print("")
    print("================================================")
    print("           ESP32 DATA RECEIVED")
    print("================================================")

    print(
        f"Temperature  : "
        f"{data.get('temperature')}"
    )

    print(
        f"X Percent    : "
        f"{data.get('xPercent')}"
    )

    print(
        f"Y Percent    : "
        f"{data.get('yPercent')}"
    )

    print(
        f"Gyro Z       : "
        f"{data.get('gyroZ')}"
    )

    print(
        f"Force 1      : "
        f"{data.get('force1')}"
    )

    print(
        f"Force 2      : "
        f"{data.get('force2')}"
    )

    print(
        f"Ultrasonic 1 : "
        f"{data.get('ultrasonic1')}"
    )

    print(
        f"Ultrasonic 2 : "
        f"{data.get('ultrasonic2')}"
    )

    print(
        f"Buzzer       : "
        f"{data.get('buzzerStatus')}"
    )

    print("================================================")


    # ========================================================
    # FIND DEVICE
    # ========================================================

    device = (
        db.query(Device)
        .filter(
            Device.id ==
            HARDWARE_DEVICE_ID
        )
        .first()
    )


    if device is None:

        raise HTTPException(
            status_code=404,
            detail=(
                "Hardware device not found. "
                f"Device ID: {HARDWARE_DEVICE_ID}"
            )
        )


    # ========================================================
    # PATIENT
    # ========================================================

    patient_id = HARDWARE_PATIENT_ID


    # ========================================================
    # READ ESP32 DATA
    # ========================================================

    temperature = to_float(
        data.get("temperature")
    )


    gyro_x = to_float(
        data.get("xPercent")
    )


    gyro_y = to_float(
        data.get("yPercent")
    )


    gyro_z = to_float(
        data.get("gyroZ")
    )


    # ========================================================
    # FORCE 1
    # ========================================================
    #
    # Stored in database only.
    #
    # NOT USED FOR FALL DETECTION.
    #
    # ========================================================

    force_fall = to_float(
        data.get("force1")
    )


    # ========================================================
    # FORCE 2
    # ========================================================
    #
    # FORCE 2 IS USED FOR:
    #
    # 1. FALL DETECTION
    # 2. SAME POSITION DETECTION
    #
    # ========================================================

    force_position = to_float(
        data.get("force2")
    )


    # ========================================================
    # ULTRASONIC SENSORS
    # ========================================================

    urine_distance = to_float(
        data.get("ultrasonic1")
    )


    iv_distance = to_float(
        data.get("ultrasonic2")
    )


    # ========================================================
    # FALL DETECTION
    # ========================================================
    #
    # ONLY FORCE 2 IS USED.
    #
    # force2 < 200
    #     -> FALLEN
    #     -> database = True
    #
    # force2 >= 200
    #     -> NOT FALLEN
    #     -> database = False
    #
    # force2 missing
    #     -> NO DEVICE READY
    #     -> database = False
    #
    # ========================================================

    if force_position is None:

        fall_detected = False

        fall_status = "NO DEVICE READY"


    elif force_position < FALL_FORCE2_THRESHOLD:

        fall_detected = True

        fall_status = "FALLEN"


    else:

        fall_detected = False

        fall_status = "NOT FALLEN"


    # ========================================================
    # PRINT FALL STATUS
    # ========================================================

    print(
        f"Fall Status  : "
        f"{fall_status}"
    )

    print(
        f"DB Fall      : "
        f"{fall_detected}"
    )

    print("================================================")
    print("")


    # ========================================================
    # HARDWARE BUZZER
    # ========================================================

    hardware_buzzer_status = to_bool(
        data.get("buzzerStatus")
    )


    # ========================================================
    # PREVIOUS READING
    # ========================================================

    previous_reading = get_previous_reading(
        db,
        patient_id,
        HARDWARE_DEVICE_ID
    )


    # ========================================================
    # PREVIOUS FALL STATUS
    # ========================================================

    previous_fall_status = False

    previous_buzzer_status = False


    if previous_reading is not None:

        previous_fall_status = bool(
            previous_reading.fall_detected
        )

        previous_buzzer_status = bool(
            previous_reading.buzzer_status
        )


    # ========================================================
    # SAME POSITION
    # ========================================================

    (
        same_position,
        position_duration_seconds,
        prolonged_position_alert
    ) = calculate_position_state(
        previous_reading,
        force_position,
        current_time
    )


    # ========================================================
    # POSITION LABEL
    # ========================================================

    if force_position is None:

        position_label = "Unknown"

    elif force_position < POSITION_VALUE_THRESHOLD:

        position_label = "Same Position"

    else:

        position_label = "Position Changed"


    # ========================================================
    # TEMPERATURE ALERT
    # ========================================================

    temperature_alert = (
        temperature is not None
        and
        temperature > TEMPERATURE_THRESHOLD
    )


    # ========================================================
    # GYRO ALERT
    # ========================================================

    gyro_alert = (

        (
            gyro_x is not None
            and
            abs(gyro_x) >= GYRO_THRESHOLD
        )

        or

        (
            gyro_y is not None
            and
            abs(gyro_y) >= GYRO_THRESHOLD
        )

        or

        (
            gyro_z is not None
            and
            abs(gyro_z) >= GYRO_THRESHOLD
        )
    )


    # ========================================================
    # URINE ALERT
    # ========================================================

    urine_alert = (
        urine_distance is not None
        and
        urine_distance < URINE_DISTANCE_THRESHOLD
    )


    # ========================================================
    # IV ALERT
    # ========================================================

    iv_alert = (
        iv_distance is not None
        and
        iv_distance < IV_DISTANCE_THRESHOLD
    )


    # ========================================================
    # FALL ALERT
    # ========================================================
    #
    # Alert only when state changes:
    #
    # Previous = False
    # Current  = True
    #
    # ========================================================

    fall_alert_triggered = (
        fall_detected
        and
        not previous_fall_status
    )


    # ========================================================
    # SOS ALERT
    # ========================================================

    sos_triggered = (
        hardware_buzzer_status
        and
        not previous_buzzer_status
    )


    # ========================================================
    # FINAL BUZZER STATUS
    # ========================================================

    final_buzzer_status = (

        hardware_buzzer_status

        or

        temperature_alert

        or

        gyro_alert

        or

        urine_alert

        or

        iv_alert

        or

        fall_detected

        or

        prolonged_position_alert
    )


    # ========================================================
    # CREATE SENSOR READING
    # ========================================================

    reading = SensorReading(

        patient_id=patient_id,

        device_id=HARDWARE_DEVICE_ID,

        temperature=temperature,

        gyro_x=gyro_x,

        gyro_y=gyro_y,

        gyro_z=gyro_z,

        # Force 1 stored only
        force_fall=force_fall,

        # Force 2
        force_position=force_position,

        urine_distance=urine_distance,

        iv_distance=iv_distance,

        # BOOLEAN ONLY
        fall_detected=bool(
            fall_detected
        ),

        same_position=same_position,

        position_duration_seconds=(
            position_duration_seconds
        ),

        position_label=position_label,

        buzzer_status=final_buzzer_status,

        recorded_at=current_time,
    )


    db.add(reading)


    # ========================================================
    # ALERT FLAGS
    # ========================================================

    sos_created = False

    fall_created = False

    position_created = False


    # ========================================================
    # SOS ALERT
    # ========================================================

    if sos_triggered:

        create_alert(

            db=db,

            patient_id=patient_id,

            alert_type="sos",

            severity="critical",

            message=(
                "Emergency SOS triggered "
                "by hardware buzzer."
            ),

            sensor_value=str(
                int(hardware_buzzer_status)
            ),
        )

        sos_created = True


    # ========================================================
    # FALL ALERT
    # ========================================================

    if fall_alert_triggered:

        create_alert(

            db=db,

            patient_id=patient_id,

            alert_type="fall",

            severity="critical",

            message=(
                "Fall detected by the "
                "patient monitoring hardware. "
                f"Force2={force_position}."
            ),

            sensor_value=(
                f"force2={force_position}"
            ),
        )

        fall_created = True


    # ========================================================
    # SAME POSITION ALERT
    # ========================================================

    previous_position_duration = 0


    if previous_reading is not None:

        previous_position_duration = (
            previous_reading.position_duration_seconds
            or 0
        )


    crossed_position_threshold = (

        prolonged_position_alert

        and

        previous_position_duration
        <
        POSITION_ALERT_DURATION_SECONDS
    )


    if crossed_position_threshold:

        create_alert(

            db=db,

            patient_id=patient_id,

            alert_type="same_position",

            severity="warning",

            message=(
                "Patient has remained in "
                "the same position. "
                f"F2 value is below "
                f"{POSITION_VALUE_THRESHOLD:g} "
                f"for at least "
                f"{POSITION_ALERT_DURATION_SECONDS} "
                "seconds."
            ),

            sensor_value=(
                f"F2={force_position}, "
                f"duration="
                f"{position_duration_seconds}s"
            ),
        )

        position_created = True


    # ========================================================
    # TEMPERATURE ALERT
    # ========================================================

    previous_temperature_alert = (

        previous_reading is not None

        and

        previous_reading.temperature is not None

        and

        previous_reading.temperature >
        TEMPERATURE_THRESHOLD
    )


    if (
        temperature_alert
        and
        not previous_temperature_alert
    ):

        create_alert(

            db=db,

            patient_id=patient_id,

            alert_type="temperature",

            severity="warning",

            message=(
                "Temperature exceeded "
                f"{TEMPERATURE_THRESHOLD:g} °C."
            ),

            sensor_value=str(
                temperature
            ),
        )


    # ========================================================
    # GYRO ALERT
    # ========================================================

    previous_gyro_alert = False


    if previous_reading is not None:

        previous_gyro_alert = (

            (
                previous_reading.gyro_x is not None
                and
                abs(
                    previous_reading.gyro_x
                ) >= GYRO_THRESHOLD
            )

            or

            (
                previous_reading.gyro_y is not None
                and
                abs(
                    previous_reading.gyro_y
                ) >= GYRO_THRESHOLD
            )

            or

            (
                previous_reading.gyro_z is not None
                and
                abs(
                    previous_reading.gyro_z
                ) >= GYRO_THRESHOLD
            )
        )


    if (
        gyro_alert
        and
        not previous_gyro_alert
    ):

        create_alert(

            db=db,

            patient_id=patient_id,

            alert_type="gyro",

            severity="warning",

            message=(
                "Abnormal movement "
                "detected by gyroscope."
            ),

            sensor_value=(
                f"X={gyro_x}, "
                f"Y={gyro_y}, "
                f"Z={gyro_z}"
            ),
        )


    # ========================================================
    # URINE ALERT
    # ========================================================

    previous_urine_alert = (

        previous_reading is not None

        and

        previous_reading.urine_distance is not None

        and

        previous_reading.urine_distance
        <
        URINE_DISTANCE_THRESHOLD
    )


    if (
        urine_alert
        and
        not previous_urine_alert
    ):

        create_alert(

            db=db,

            patient_id=patient_id,

            alert_type="urine",

            severity="warning",

            message=(
                "Urine container distance "
                "is below the configured "
                "threshold."
            ),

            sensor_value=str(
                urine_distance
            ),
        )


    # ========================================================
    # IV ALERT
    # ========================================================

    previous_iv_alert = (

        previous_reading is not None

        and

        previous_reading.iv_distance is not None

        and

        previous_reading.iv_distance
        <
        IV_DISTANCE_THRESHOLD
    )


    if (
        iv_alert
        and
        not previous_iv_alert
    ):

        create_alert(

            db=db,

            patient_id=patient_id,

            alert_type="iv",

            severity="warning",

            message=(
                "IV distance is below "
                "the configured threshold."
            ),

            sensor_value=str(
                iv_distance
            ),
        )


    # ========================================================
    # UPDATE DEVICE
    # ========================================================

    device.last_seen_at = current_time

    device.is_active = True


    # ========================================================
    # SAVE
    # ========================================================

    db.commit()


    # ========================================================
    # REFRESH
    # ========================================================

    db.refresh(reading)


    # ========================================================
    # RESPONSE
    # ========================================================

    return {

        "success": True,

        "message": (
            "Hardware data received "
            "successfully."
        ),

        "patient_id": patient_id,

        "device_id": HARDWARE_DEVICE_ID,

        "reading_id": reading.id,


        # ====================================================
        # FALL
        # ====================================================

        "fall": bool(
            fall_detected
        ),

        "fall_status": fall_status,


        # ====================================================
        # POSITION
        # ====================================================

        "position": {

            "value": force_position,

            "below_100": (
                force_position is not None
                and
                force_position <
                POSITION_VALUE_THRESHOLD
            ),

            "same_position": (
                same_position
            ),

            "duration_seconds": (
                position_duration_seconds
            ),

            "alert_after_seconds": (
                POSITION_ALERT_DURATION_SECONDS
            ),

            "alert_triggered": (
                position_created
            ),
        },


        # ====================================================
        # BUZZER
        # ====================================================

        "buzzer": int(
            final_buzzer_status
        ),


        # ====================================================
        # ALERTS
        # ====================================================

        "alerts": {

            "sos_created": (
                sos_created
            ),

            "fall_created": (
                fall_created
            ),

            "same_position_created": (
                position_created
            ),

            "temperature": (
                temperature_alert
            ),

            "gyro": (
                gyro_alert
            ),

            "urine": (
                urine_alert
            ),

            "iv": (
                iv_alert
            ),

            "prolonged_position": (
                prolonged_position_alert
            ),
        },
    }