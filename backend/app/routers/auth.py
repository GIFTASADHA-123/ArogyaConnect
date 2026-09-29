from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db

from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse
)

from app.services.auth_service import (
    authenticate_user,
    register_user
)


router = APIRouter(
    tags=["Authentication"]
)


# =========================================================
# LOGIN
# =========================================================

@router.post(
    "/login",
    response_model=LoginResponse
)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):

    user = authenticate_user(
        db=db,
        username=login_data.username,
        password=login_data.password,
        role=login_data.role
    )

    if user is None:

        return LoginResponse(
            success=False,
            message="Invalid username, password, or role"
        )

    return LoginResponse(
        success=True,
        message="Login successful",
        user_id=user.id,
        username=user.username,
        role=user.role
    )


# =========================================================
# REGISTER
# =========================================================

@router.post(
    "/register",
    response_model=RegisterResponse
)
def register(
    register_data: RegisterRequest,
    db: Session = Depends(get_db)
):

    user, error = register_user(
        db=db,
        username=register_data.username,
        password=register_data.password,
        role=register_data.role
    )

    if error:

        return RegisterResponse(
            success=False,
            message=error
        )

    return RegisterResponse(
        success=True,
        message="Registration successful",
        user_id=user.id,
        username=user.username,
        role=user.role
    )