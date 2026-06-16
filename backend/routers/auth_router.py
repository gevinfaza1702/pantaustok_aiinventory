"""Authentication router: register, login, current user, user management."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.auth_models import User
from services.auth_service import (
    authenticate_user,
    create_access_token,
    create_user,
    get_current_user,
    require_roles,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ─── Schemas ─────────────────────────────────────────────
class UserCreate(BaseModel):
    username: str = Field(..., max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=4)
    full_name: str = Field("", max_length=255)
    role: str = Field("staff")


class UserOut(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool

    @classmethod
    def from_orm_user(cls, u: User) -> "UserOut":
        return cls(
            id=str(u.id),
            username=u.username,
            email=u.email,
            full_name=u.full_name or "",
            role=u.role,
            is_active=u.is_active,
        )


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ─── Endpoints ───────────────────────────────────────────
@router.post("/register", response_model=UserOut)
async def register(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("admin")),  # only admins create users
):
    user = await create_user(
        db,
        username=payload.username,
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
        role=payload.role,
    )
    return UserOut.from_orm_user(user)


@router.post("/login", response_model=TokenOut)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    token = create_access_token({"sub": user.username, "role": user.role})
    return TokenOut(access_token=token, user=UserOut.from_orm_user(user))


@router.get("/me", response_model=UserOut)
async def read_me(current_user: User = Depends(get_current_user)):
    return UserOut.from_orm_user(current_user)


@router.get("/users", response_model=List[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    result = await db.execute(select(User).order_by(User.created_at))
    return [UserOut.from_orm_user(u) for u in result.scalars().all()]
