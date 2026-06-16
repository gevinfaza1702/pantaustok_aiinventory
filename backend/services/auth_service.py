"""
Authentication Service
Password hashing, JWT creation/validation, and FastAPI dependencies
for getting the current user and enforcing roles.
"""

from datetime import datetime, timedelta
from typing import Optional, List
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from config import settings
from models.auth_models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# tokenUrl is relative to the API root; clients post to /api/v1/auth/login
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_STR}/auth/login")

# Role hierarchy — higher number = more privileges
ROLE_LEVEL = {"staff": 1, "manager": 2, "admin": 3}


# ─── Password helpers ────────────────────────────────────
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ─── Token helpers ───────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


# ─── User operations ─────────────────────────────────────
async def get_user_by_username(session: AsyncSession, username: str) -> Optional[User]:
    result = await session.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def create_user(
    session: AsyncSession,
    username: str,
    email: str,
    password: str,
    full_name: str = "",
    role: str = "staff",
) -> User:
    if role not in ROLE_LEVEL:
        raise HTTPException(status_code=400, detail=f"Invalid role: {role}")

    existing = await get_user_by_username(session, username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")

    user = User(
        username=username,
        email=email,
        full_name=full_name or username,
        hashed_password=hash_password(password),
        role=role,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def authenticate_user(
    session: AsyncSession, username: str, password: str
) -> Optional[User]:
    user = await get_user_by_username(session, username)
    if not user or not user.is_active:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    user.last_login = datetime.utcnow()
    await session.commit()
    return user


# ─── FastAPI dependencies ────────────────────────────────
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_db),
) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    user = await get_user_by_username(session, username)
    if user is None or not user.is_active:
        raise credentials_exc
    return user


def require_roles(*allowed_roles: str):
    """Dependency factory: ensure current user has one of the allowed roles
    (or a higher privilege level than the lowest allowed)."""
    min_level = min(ROLE_LEVEL[r] for r in allowed_roles)

    async def _checker(current_user: User = Depends(get_current_user)) -> User:
        if ROLE_LEVEL.get(current_user.role, 0) < min_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for this action",
            )
        return current_user

    return _checker


async def ensure_default_admin(session: AsyncSession) -> None:
    """Create a default admin account on first startup if no users exist."""
    result = await session.execute(select(User).limit(1))
    if result.scalar_one_or_none() is None:
        await create_user(
            session,
            username="admin",
            email="admin@pantaustok.local",
            password="admin123",
            full_name="Administrator",
            role="admin",
        )
