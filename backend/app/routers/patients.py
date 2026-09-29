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


router = APIRouter(
    tags=["Patients"]
)


# =========================================================
# PATIENT SERIALIZER
# =========================================================

def patient_to_dict(
    patient: Patient
) -> dict:

    return {

        "id":
            patient.id,

        "patient_code":
            patient.patient_code,

        "full_name":
            patient.full_name,

        "age":
            patient.age,

        "gender":
            patient.gender,

        "ward":
            patient.ward,

        "bed_number":
            patient.bed_number,

        "blood_group":
            patient.blood_group,

        "phone":
            patient.phone,

        "emergency_contact":
            patient.emergency_contact,

        "emergency_phone":
            patient.emergency_phone,

        # Frontend compatibility
        "emergency_contact_name":
            patient.emergency_contact,

        "emergency_contact_phone":
            patient.emergency_phone,

        "diagnosis":
            patient.diagnosis,

        # Frontend compatibility
        "medical_conditions":
            patient.diagnosis,

        "doctor_name":
            patient.doctor_name,

        "admission_date":
            (
                patient.admission_date.isoformat()
                if patient.admission_date
                else None
            ),

        "status":
            patient.status,

        "is_active":
            (
                str(
                    patient.status or ""
                ).lower()
                == "active"
            ),

        "created_at":
            (
                patient.created_at.isoformat()
                if patient.created_at
                else None
            ),

        # This column does not exist
        # in the current database.
        "updated_at":
            None
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
# ALL PATIENTS
# =========================================================

@router.get("/")
def get_patients(

    active_only: bool = Query(
        True
    ),

    active: Optional[bool] = Query(
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

    query = db.query(
        Patient
    )


    # -----------------------------------------------------
    # ACTIVE FILTER
    # -----------------------------------------------------

    if active is not None:

        if active:

            query = query.filter(
                Patient.status == "active"
            )

        else:

            query = query.filter(
                Patient.status != "active"
            )


    elif active_only:

        query = query.filter(
            Patient.status == "active"
        )


    # -----------------------------------------------------
    # GET PATIENTS
    # -----------------------------------------------------

    patients = (
        query
        .order_by(
            Patient.id.asc()
        )
        .limit(limit)
        .all()
    )


    # -----------------------------------------------------
    # RETURN
    # -----------------------------------------------------

    return [

        patient_to_dict(
            patient
        )

        for patient in patients

    ]


# =========================================================
# PATIENT BY ID
# =========================================================

@router.get(
    "/{patient_id}"
)
def get_patient(

    patient_id: int,

    db: Session = Depends(
        get_db
    )

):

    patient = get_patient_or_404(
        db,
        patient_id
    )


    return patient_to_dict(
        patient
    )


# =========================================================
# PATIENT BY CODE
# =========================================================

@router.get(
    "/code/{patient_code}"
)
def get_patient_by_code(

    patient_code: str,

    db: Session = Depends(
        get_db
    )

):

    patient = (
        db.query(Patient)
        .filter(
            Patient.patient_code ==
            patient_code
        )
        .first()
    )


    if patient is None:

        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )


    return patient_to_dict(
        patient
    )


# =========================================================
# CURRENT ACTIVE PATIENT
# =========================================================

@router.get(
    "/current/active"
)
def get_current_active_patient(

    db: Session = Depends(
        get_db
    )

):

    patient = (
        db.query(Patient)
        .filter(
            Patient.status == "active"
        )
        .order_by(
            Patient.id.asc()
        )
        .first()
    )


    if patient is None:

        return {

            "active":
                False,

            "patient":
                None
        }


    return {

        "active":
            True,

        "patient":
            patient_to_dict(
                patient
            )
    }


# =========================================================
# SEARCH PATIENTS
# =========================================================

@router.get(
    "/search/by-name"
)
def search_patients(

    q: str = Query(
        ...,
        min_length=1
    ),

    db: Session = Depends(
        get_db
    )

):

    # -----------------------------------------------------
    # SEARCH TEXT
    # -----------------------------------------------------

    search_text = (
        f"%{q.strip()}%"
    )


    # -----------------------------------------------------
    # SEARCH BY NAME OR PATIENT CODE
    # -----------------------------------------------------

    patients = (
        db.query(Patient)
        .filter(
            Patient.status == "active"
        )
        .filter(
            (
                Patient.full_name.ilike(
                    search_text
                )
            )
            |
            (
                Patient.patient_code.ilike(
                    search_text
                )
            )
        )
        .order_by(
            Patient.full_name.asc()
        )
        .all()
    )


    # -----------------------------------------------------
    # RETURN SEARCH RESULTS
    # -----------------------------------------------------

    return [

        patient_to_dict(
            patient
        )

        for patient in patients

    ]