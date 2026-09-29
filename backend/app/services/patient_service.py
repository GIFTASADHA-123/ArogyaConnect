from sqlalchemy.orm import Session

from app.models.patient import Patient


def get_all_patients(db: Session):
    return (
        db.query(Patient)
        .filter(Patient.is_active == True)
        .order_by(Patient.id.asc())
        .all()
    )


def get_patient_by_id(
    db: Session,
    patient_id: int
):
    return (
        db.query(Patient)
        .filter(
            Patient.id == patient_id,
            Patient.is_active == True
        )
        .first()
    )


def get_patient_by_code(
    db: Session,
    patient_code: str
):
    return (
        db.query(Patient)
        .filter(
            Patient.patient_code == patient_code,
            Patient.is_active == True
        )
        .first()
    )