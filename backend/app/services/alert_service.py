from datetime import datetime

from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.patient import Patient
from app.models.user import User
from app.schemas.alert import AlertCreate


# =========================================================
# CREATE ALERT
# =========================================================

def create_alert(
    db: Session,
    data: AlertCreate
):

    patient = (
        db.query(Patient)
        .filter(
            Patient.id == data.patient_id
        )
        .first()
    )

    if patient is None:
        return None, "Patient not found"

    alert = Alert(
        patient_id=data.patient_id,
        alert_type=data.alert_type,
        severity=data.severity,
        message=data.message,
        acknowledged=False
    )

    db.add(alert)

    try:

        db.commit()

        db.refresh(alert)

    except Exception as error:

        db.rollback()

        return None, f"Unable to create alert: {error}"

    return alert, None


# =========================================================
# GET ALL PATIENT ALERTS
# =========================================================

def get_patient_alerts(
    db: Session,
    patient_id: int
):

    return (
        db.query(Alert)
        .filter(
            Alert.patient_id == patient_id
        )
        .order_by(
            Alert.created_at.desc()
        )
        .all()
    )


# =========================================================
# GET ACTIVE ALERTS
# =========================================================

def get_active_alerts(
    db: Session,
    patient_id: int
):

    return (
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
        .all()
    )


# =========================================================
# ACKNOWLEDGE ALERT
# =========================================================

def acknowledge_alert(
    db: Session,
    alert_id: int,
    user_id: int
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
        return None, "Alert not found"


    # -----------------------------------------------------
    # FIND USER
    # -----------------------------------------------------

    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )

    if user is None:
        return None, "User not found"


    # -----------------------------------------------------
    # CHECK ALREADY ACKNOWLEDGED
    # -----------------------------------------------------

    if alert.acknowledged:
        return None, "Alert is already acknowledged"


    # -----------------------------------------------------
    # UPDATE ALERT
    # -----------------------------------------------------

    alert.acknowledged = True

    alert.acknowledged_by = user_id

    alert.acknowledged_at = datetime.now()


    # -----------------------------------------------------
    # SAVE CHANGES
    # -----------------------------------------------------

    try:

        db.commit()

        db.refresh(alert)

    except Exception as error:

        db.rollback()

        return None, f"Unable to acknowledge alert: {error}"


    return alert, None