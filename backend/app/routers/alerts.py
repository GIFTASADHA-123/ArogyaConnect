from datetime import datetime
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query
)

from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.alert import Alert
from app.models.patient import Patient
from app.models.user import User


router = APIRouter(
    tags=["Alerts"]
)


# =========================================================
# HELPER - GET PATIENT
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
# SERIALIZE ALERT
# =========================================================

def serialize_alert(
    alert: Alert
):

    return {

        "id":
            alert.id,

        "patient_id":
            alert.patient_id,

        # Current alerts table does not contain device_id.
        "device_id":
            None,

        "alert_type":
            alert.alert_type,

        "severity":
            alert.severity,

        "message":
            alert.message,

        "sensor_value":
            getattr(
                alert,
                "sensor_value",
                None
            ),

        "acknowledged":
            bool(
                alert.acknowledged
            ),

        "acknowledged_by":
            alert.acknowledged_by,

        "acknowledged_at":
            (
                alert.acknowledged_at.isoformat()
                if alert.acknowledged_at
                else None
            ),

        "created_at":
            (
                alert.created_at.isoformat()
                if alert.created_at
                else None
            )
    }


# =========================================================
# GET ALL ALERTS FOR PATIENT
# =========================================================

@router.get(
    "/patient/{patient_id}"
)
def get_patient_alerts(

    patient_id: int,

    acknowledged: Optional[bool] = Query(
        None
    ),

    limit: int = Query(
        100,
        ge=1,
        le=1000
    ),

    db: Session = Depends(
        get_db
    )

):

    # -----------------------------------------------------
    # VERIFY PATIENT
    # -----------------------------------------------------

    get_patient_or_404(
        db,
        patient_id
    )


    # -----------------------------------------------------
    # START QUERY
    # -----------------------------------------------------

    query = (
        db.query(Alert)
        .filter(
            Alert.patient_id == patient_id
        )
    )


    # -----------------------------------------------------
    # OPTIONAL ACKNOWLEDGED FILTER
    # -----------------------------------------------------

    if acknowledged is not None:

        query = query.filter(
            Alert.acknowledged == acknowledged
        )


    # -----------------------------------------------------
    # GET ALERTS
    # -----------------------------------------------------

    alerts = (
        query
        .order_by(
            Alert.created_at.desc()
        )
        .limit(limit)
        .all()
    )


    return [
        serialize_alert(alert)
        for alert in alerts
    ]


# =========================================================
# GET ACTIVE / UNACKNOWLEDGED ALERTS
# =========================================================

@router.get(
    "/patient/{patient_id}/active"
)
def get_active_alerts(

    patient_id: int,

    limit: int = Query(
        100,
        ge=1,
        le=1000
    ),

    db: Session = Depends(
        get_db
    )

):

    # -----------------------------------------------------
    # VERIFY PATIENT
    # -----------------------------------------------------

    get_patient_or_404(
        db,
        patient_id
    )


    # -----------------------------------------------------
    # GET ACTIVE ALERTS
    # -----------------------------------------------------

    alerts = (
        db.query(Alert)
        .filter(
            Alert.patient_id == patient_id
        )
        .filter(
            Alert.acknowledged.is_(False)
        )
        .order_by(
            Alert.created_at.desc()
        )
        .limit(limit)
        .all()
    )


    return [
        serialize_alert(alert)
        for alert in alerts
    ]


# =========================================================
# GET SINGLE ALERT
# =========================================================

@router.get(
    "/{alert_id}"
)
def get_alert(

    alert_id: int,

    db: Session = Depends(
        get_db
    )

):

    alert = (
        db.query(Alert)
        .filter(
            Alert.id == alert_id
        )
        .first()
    )


    if alert is None:

        raise HTTPException(
            status_code=404,
            detail="Alert not found"
        )


    return serialize_alert(
        alert
    )


# =========================================================
# ACKNOWLEDGE ALERT
# =========================================================

@router.patch(
    "/{alert_id}/acknowledge"
)
def acknowledge_alert(

    alert_id: int,

    user_id: Optional[int] = Query(
        None
    ),

    db: Session = Depends(
        get_db
    )

):

    # -----------------------------------------------------
    # FIND ALERT
    # -----------------------------------------------------

    alert = (
        db.query(Alert)
        .filter(
            Alert.id == alert_id
        )
        .first()
    )


    if alert is None:

        raise HTTPException(
            status_code=404,
            detail="Alert not found"
        )


    # -----------------------------------------------------
    # VERIFY USER IF PROVIDED
    # -----------------------------------------------------

    if user_id is not None:

        user = (
            db.query(User)
            .filter(
                User.id == user_id
            )
            .first()
        )


        if user is None:

            raise HTTPException(
                status_code=404,
                detail="User not found"
            )


    # -----------------------------------------------------
    # MARK AS ACKNOWLEDGED
    # -----------------------------------------------------

    alert.acknowledged = True

    alert.acknowledged_by = user_id

    alert.acknowledged_at = datetime.now()


    # -----------------------------------------------------
    # SAVE
    # -----------------------------------------------------

    try:

        db.commit()

        db.refresh(
            alert
        )

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to acknowledge alert: "
                f"{error}"
            )
        )


    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return {

        "success":
            True,

        "message":
            "Alert acknowledged successfully",

        "alert":
            serialize_alert(
                alert
            )
    }


# =========================================================
# CREATE ALERT
# =========================================================

@router.post(
    "/"
)
def create_alert(

    data: dict,

    db: Session = Depends(
        get_db
    )

):

    # -----------------------------------------------------
    # GET PATIENT ID
    # -----------------------------------------------------

    patient_id = data.get(
        "patient_id"
    )


    if patient_id is None:

        raise HTTPException(
            status_code=400,
            detail="patient_id is required"
        )


    # -----------------------------------------------------
    # VERIFY PATIENT
    # -----------------------------------------------------

    try:

        patient_id = int(
            patient_id
        )

    except (TypeError, ValueError):

        raise HTTPException(
            status_code=400,
            detail="patient_id must be a valid integer"
        )


    get_patient_or_404(
        db,
        patient_id
    )


    # -----------------------------------------------------
    # GET ALERT DATA
    # -----------------------------------------------------

    alert_type = data.get(
        "alert_type",
        "general"
    )


    severity = data.get(
        "severity",
        "warning"
    )


    message = data.get(
        "message",
        "Patient monitoring alert"
    )


    sensor_value = data.get(
        "sensor_value"
    )


    # -----------------------------------------------------
    # CREATE ALERT
    # -----------------------------------------------------

    alert = Alert(

        patient_id=patient_id,

        alert_type=alert_type,

        severity=severity,

        message=message,

        sensor_value=sensor_value,

        acknowledged=False
    )


    # -----------------------------------------------------
    # SAVE ALERT
    # -----------------------------------------------------

    try:

        db.add(
            alert
        )

        db.commit()

        db.refresh(
            alert
        )

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to create alert: "
                f"{error}"
            )
        )


    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return {

        "success":
            True,

        "message":
            "Alert created successfully",

        "alert":
            serialize_alert(
                alert
            )
    }