from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str
    role: str


class LoginResponse(BaseModel):
    success: bool
    message: str
    user_id: int | None = None
    username: str | None = None
    role: str | None = None


class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str


class RegisterResponse(BaseModel):
    success: bool
    message: str
    user_id: int | None = None
    username: str | None = None
    role: str | None = None