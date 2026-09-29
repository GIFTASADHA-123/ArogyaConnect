"""
ArogyaConnect - Temporary Sensor Simulator

Development/testing only.

This simulator generates changing sensor readings for ONE
patient and stores them in MySQL.

It is temporary.

When the real ESP32 starts sending sensor readings to
FastAPI, this simulator should be disabled.
"""


import asyncio
import random
from datetime import datetime


from sqlalchemy.orm import Session


from app.database.database import SessionLocal
from app.models.sensor_reading import SensorReading


# =========================================================
# DEVELOPMENT CONFIGURATION
# =========================================================

TEST_PATIENT_ID = 1

TEST_DEVICE_ID = 1

READING_INTERVAL_SECONDS = 5


# =========================================================
# GENERATE SENSOR VALUES
# =========================================================

def generate_sensor_values():

    # -----------------------------------------------------
    # Temperature
    # -----------------------------------------------------

    temperature = round(
        random.uniform(
            36.2,
            37.2
        ),
        2
    )


    # -----------------------------------------------------
    # Gyroscope
    # -----------------------------------------------------

    gyro_x = round(
        random.uniform(
            -1.50,
            1.50
        ),
        4
    )

    gyro_y = round(
        random.uniform(
            -1.50,
            1.50
        ),
        4
    )

    gyro_z = round(
        random.uniform(
            8.80,
            10.20
        ),
        4
    )


    # -----------------------------------------------------
    # Temporary fall simulation
    #
    # IMPORTANT:
    # This is only development data.
    # Actual fall logic will come from the real sensor
    # firmware / monitoring logic later.
    # -----------------------------------------------------

    fall_detected = (
        random.random() < 0.02
    )


    if fall_detected:

        force_fall = round(
            random.uniform(
                550,
                850
            ),
            2
        )

    else:

        force_fall = round(
            random.uniform(
                100,
                350
            ),
            2
        )


    # -----------------------------------------------------
    # Position force sensor
    # -----------------------------------------------------

    force_position = round(
        random.uniform(
            300,
            700
        ),
        2
    )


    # -----------------------------------------------------
    # Temporary position value
    #
    # Actual position interpretation should eventually
    # match the real sensor/ESP32 logic.
    # -----------------------------------------------------

    position_status = random.choice(
        [
            "lying",
            "left",
            "right",
            "sitting"
        ]
    )


    # -----------------------------------------------------
    # Temporary position duration
    # -----------------------------------------------------

    position_duration_seconds = random.randint(
        10,
        600
    )


    # -----------------------------------------------------
    # Urine level distance
    # -----------------------------------------------------

    urine_distance = round(
        random.uniform(
            5.0,
            25.0
        ),
        2
    )


    # -----------------------------------------------------
    # IV fluid level distance
    # -----------------------------------------------------

    iv_distance = round(
        random.uniform(
            5.0,
            25.0
        ),
        2
    )


    # -----------------------------------------------------
    # Reading time
    # -----------------------------------------------------

    recorded_at = datetime.now()


    return {

        "patient_id":
            TEST_PATIENT_ID,

        "device_id":
            TEST_DEVICE_ID,

        "temperature":
            temperature,

        "gyro_x":
            gyro_x,

        "gyro_y":
            gyro_y,

        "gyro_z":
            gyro_z,

        "force_fall":
            force_fall,

        "force_position":
            force_position,

        "urine_distance":
            urine_distance,

        "iv_distance":
            iv_distance,

        "position_status":
            position_status,

        "position_duration_seconds":
            position_duration_seconds,

        "fall_detected":
            fall_detected,

        "recorded_at":
            recorded_at
    }


# =========================================================
# SAVE ONE READING
# =========================================================

def save_sensor_reading():

    db: Session = SessionLocal()

    try:

        values = (
            generate_sensor_values()
        )


        reading = SensorReading(

            patient_id=
                values["patient_id"],

            device_id=
                values["device_id"],

            temperature=
                values["temperature"],

            gyro_x=
                values["gyro_x"],

            gyro_y=
                values["gyro_y"],

            gyro_z=
                values["gyro_z"],

            force_fall=
                values["force_fall"],

            force_position=
                values["force_position"],

            urine_distance=
                values["urine_distance"],

            iv_distance=
                values["iv_distance"],

            position_status=
                values["position_status"],

            position_duration_seconds=
                values[
                    "position_duration_seconds"
                ],

            fall_detected=
                values["fall_detected"],

            recorded_at=
                values["recorded_at"]
        )


        db.add(
            reading
        )

        db.commit()

        db.refresh(
            reading
        )


        print(
            "[SIMULATOR]",
            values["recorded_at"].strftime(
                "%Y-%m-%d %H:%M:%S"
            ),

            "| Patient DB ID:",
            values["patient_id"],

            "| Temperature:",
            values["temperature"],

            "| Gyro:",
            (
                values["gyro_x"],
                values["gyro_y"],
                values["gyro_z"]
            ),

            "| Fall:",
            values["fall_detected"],

            "| Position:",
            values["position_status"],

            "| Position Duration:",
            values[
                "position_duration_seconds"
            ],
            "sec",

            "| Urine:",
            values["urine_distance"],

            "| IV:",
            values["iv_distance"]
        )


    except Exception as error:

        db.rollback()

        print(
            "[SIMULATOR ERROR]",
            repr(error)
        )


    finally:

        db.close()


# =========================================================
# CONTINUOUS SIMULATOR
# =========================================================

async def run_sensor_simulator():

    print()

    print(
        "=" * 60
    )

    print(
        "ArogyaConnect Sensor Simulator"
    )

    print(
        "=" * 60
    )

    print(
        f"Patient DB ID : "
        f"{TEST_PATIENT_ID}"
    )

    print(
        f"Device DB ID  : "
        f"{TEST_DEVICE_ID}"
    )

    print(
        f"Interval      : "
        f"{READING_INTERVAL_SECONDS} seconds"
    )

    print(
        "Status        : RUNNING"
    )

    print(
        "=" * 60
    )

    print()


    while True:

        save_sensor_reading()

        await asyncio.sleep(
            READING_INTERVAL_SECONDS
        )