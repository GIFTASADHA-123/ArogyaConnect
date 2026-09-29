from sqlalchemy.orm import Session

from app.models.user import User


def authenticate_user(
    db: Session,
    username: str,
    password: str,
    role: str
):
    user = (
        db.query(User)
        .filter(User.username == username)
        .first()
    )

    if user is None:
        return None

    if user.password != password:
        return None

    if user.role != role:
        return None

    if not user.is_active:
        return None

    return user


def register_user(
    db: Session,
    username: str,
    password: str,
    role: str
):
    existing_user = (
        db.query(User)
        .filter(User.username == username)
        .first()
    )

    if existing_user is not None:
        return None, "Username already exists"

    if role not in ["nurse", "doctor"]:
        return None, "Invalid role"

    if not username.strip():
        return None, "Username is required"

    if not password:
        return None, "Password is required"

    new_user = User(
        username=username.strip(),
        password=password,
        role=role,
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user, None