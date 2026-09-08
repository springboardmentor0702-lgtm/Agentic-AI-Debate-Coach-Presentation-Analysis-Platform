from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str = "LEARNER"
    admin_key: str | None = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        normalized = value.upper().replace(" ", "_")
        if normalized == "EXPERT":
            normalized = "DEBATE_EXPERT"
        if normalized not in {"LEARNER", "DEBATE_EXPERT", "DEBATE_COACH", "ADMIN"}:
            raise ValueError("Role must be LEARNER or DEBATE_EXPERT")
        return normalized

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    role: str
    is_active: bool


class AuthResponse(BaseModel):
    user: UserPublic
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
