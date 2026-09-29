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
from app.models.patient_event import PatientEvent


router = APIRouter(
    tags=["Patient Events"]
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
# EVENT TITLE
# =========================================================

def get_event_title(
    event_type
):

    return (
        str(
            event_type or "general"
        )
        .replace(
            "_",
            " "
        )
        .title()
    )


# =========================================================
# EVENT SEVERITY
# =========================================================

def get_event_severity(
    event_type
):

    event_type = str(
        event_type or ""
    ).lower()

    # -----------------------------------------------------
    # CRITICAL EVENTS
    # -----------------------------------------------------

    if event_type == "fall":

        return "danger"


    # -----------------------------------------------------
    # WARNING / ATTENTION EVENTS
    # -----------------------------------------------------

    if event_type in {

        "high_temperature",
        "abnormal_motion",
        "urine_level",
        "iv_level",
        "prolonged_position",
        "temperature",
        "motion",
        "urine",
        "iv",
        "position"

    }:

        return "attention"


    # -----------------------------------------------------
    # NORMAL / INFORMATIONAL EVENTS
    # -----------------------------------------------------

    return "normal"


# =========================================================
# SERIALIZE EVENT
# =========================================================

def serialize_event(
    event: PatientEvent
):

    return {

        "id":
            event.id,

        "patient_id":
            event.patient_id,

        "event_type":
            event.event_type,

        "title":
            get_event_title(
                event.event_type
            ),

        "description":
            event.description,

        "severity":
            get_event_severity(
                event.event_type
            ),

        # Current patient_events table
        # does not contain created_by.
        "created_by":
            None,

        "created_at":
            (
                event.created_at.isoformat()
                if event.created_at
                else None
            )
    }


# =========================================================
# GET PATIENT EVENTS
# =========================================================

@router.get(
    "/patient/{patient_id}"
)
def get_patient_events(

    patient_id: int,

    limit: int = Query(
        100,
        ge=1,
        le=1000
    ),

    event_type: Optional[str] = Query(
        None
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
    # BUILD QUERY
    # -----------------------------------------------------

    query = (
        db.query(
            PatientEvent
        )
        .filter(
            PatientEvent.patient_id == patient_id
        )
    )


    # -----------------------------------------------------
    # OPTIONAL EVENT TYPE FILTER
    # -----------------------------------------------------

    if event_type:

        query = query.filter(
            PatientEvent.event_type == event_type
        )


    # -----------------------------------------------------
    # GET EVENTS
    # -----------------------------------------------------

    events = (
        query
        .order_by(
            PatientEvent.created_at.desc()
        )
        .limit(limit)
        .all()
    )


    # -----------------------------------------------------
    # RETURN EVENTS
    # -----------------------------------------------------

    return [
        serialize_event(event)
        for event in events
    ]


# =========================================================
# GET SINGLE EVENT
# =========================================================

@router.get(
    "/{event_id}"
)
def get_event(

    event_id: int,

    db: Session = Depends(
        get_db
    )

):

    event = (
        db.query(
            PatientEvent
        )
        .filter(
            PatientEvent.id == event_id
        )
        .first()
    )


    if event is None:

        raise HTTPException(
            status_code=404,
            detail="Patient event not found"
        )


    return serialize_event(
        event
    )


# =========================================================
# CREATE PATIENT EVENT
# =========================================================

@router.post(
    "/"
)
def create_event(

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
    # VALIDATE PATIENT ID
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


    # -----------------------------------------------------
    # VERIFY PATIENT
    # -----------------------------------------------------

    get_patient_or_404(
        db,
        patient_id
    )


    # -----------------------------------------------------
    # GET EVENT TYPE
    # -----------------------------------------------------

    event_type = data.get(
        "event_type",
        "general"
    )


    # -----------------------------------------------------
    # GET DESCRIPTION
    # -----------------------------------------------------

    description = (

        data.get(
            "description"
        )

        or

        data.get(
            "title"
        )

        or

        "Patient event"
    )


    # -----------------------------------------------------
    # CREATE EVENT
    # -----------------------------------------------------

    event = PatientEvent(

        patient_id=patient_id,

        event_type=event_type,

        description=description
    )


    # -----------------------------------------------------
    # SAVE EVENT
    # -----------------------------------------------------

    try:

        db.add(
            event
        )

        db.commit()

        db.refresh(
            event
        )

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to create patient event: "
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
            "Patient event created successfully",

        "event":
            serialize_event(
                event
            )
    }