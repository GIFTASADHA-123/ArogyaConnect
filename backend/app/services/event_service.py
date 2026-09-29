from sqlalchemy.orm import Session

from app.models.patient import Patient
from app.models.patient_event import PatientEvent
from app.schemas.event import PatientEventCreate


# =========================================================
# CREATE PATIENT EVENT
# =========================================================

def create_patient_event(
    db: Session,
    data: PatientEventCreate
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
    # EVENT DESCRIPTION
    # -----------------------------------------------------

    description = (
        data.description
        or getattr(data, "title", None)
        or "Patient event"
    )


    # -----------------------------------------------------
    # CREATE EVENT
    # -----------------------------------------------------

    event = PatientEvent(
        patient_id=data.patient_id,
        event_type=data.event_type,
        description=description
    )


    db.add(event)


    # -----------------------------------------------------
    # SAVE EVENT
    # -----------------------------------------------------

    try:

        db.commit()

        db.refresh(event)

    except Exception as error:

        db.rollback()

        return None, f"Unable to create patient event: {error}"


    return event, None


# =========================================================
# GET PATIENT EVENTS
# =========================================================

def get_patient_events(
    db: Session,
    patient_id: int
):

    return (
        db.query(
            PatientEvent
        )
        .filter(
            PatientEvent.patient_id == patient_id
        )
        .order_by(
            PatientEvent.created_at.desc()
        )
        .all()
    )