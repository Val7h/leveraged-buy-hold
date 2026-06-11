from datetime import datetime, timedelta
from typing import Optional, Set
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
import os
import json

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# Token blacklist for logout (in production, use Redis)
_token_blacklist: Set[str] = set()


def add_token_to_blacklist(token: str) -> None:
    """Add token to blacklist on logout."""
    _token_blacklist.add(token)


def is_token_blacklisted(token: str) -> bool:
    """Check if token is blacklisted."""
    return token in _token_blacklist


def get_token_blacklist() -> Set[str]:
    """Get current token blacklist."""
    return _token_blacklist.copy()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
    token_type: str = "access"
) -> str:
    """Create JWT access or refresh token."""
    to_encode = data.copy()

    if token_type == "access":
        expire = datetime.utcnow() + (
            expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
    elif token_type == "refresh":
        expire = datetime.utcnow() + (
            expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        )
    else:
        raise ValueError(f"Unknown token type: {token_type}")

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": token_type,  # Token type claim
    })

    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_token_pair(user_email: str) -> dict:
    """Create both access and refresh tokens."""
    access_token = create_access_token(
        data={"sub": user_email},
        token_type="access"
    )
    refresh_token = create_access_token(
        data={"sub": user_email},
        token_type="refresh"
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
    token_type: str = "access"
):
    """Get current user from token. Validates token type and blacklist."""
    from app.models.user import User

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Check if token is blacklisted
        if is_token_blacklisted(token):
            raise credentials_exception

        # Decode JWT
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        email: str = payload.get("sub")
        token_type_claim: str = payload.get("type", "access")

        if email is None:
            raise credentials_exception

        # Verify token type matches expected type
        if token_type_claim != token_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Expected {token_type} token, got {token_type_claim}",
                headers={"WWW-Authenticate": "Bearer"},
            )

    except JWTError as e:
        raise credentials_exception

    # Get user from database
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception

    return user


def get_current_user_from_refresh_token(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Get current user from refresh token (for token refresh endpoint)."""
    return get_current_user(token, db, token_type="refresh")


def get_current_user_or_demo(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Get current user, or return a demo user if DEMO_MODE is enabled.
    Allows full testing of the app without authentication.
    """
    from app.models.user import User

    demo_mode = os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "yes")

    if demo_mode and token.startswith("demo_token_"):
        # Create or get a demo user
        demo_user = db.query(User).filter(User.email == "demo@example.com").first()
        if not demo_user:
            demo_user = User(
                email="demo@example.com",
                full_name="Demo User",
                hashed_password=get_password_hash("demo"),
                risk_profile="balanced",
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)
        return demo_user

    # Fall back to regular auth
    return get_current_user(token, db)


__all__ = [
    "pwd_context",
    "oauth2_scheme",
    "verify_password",
    "get_password_hash",
    "create_access_token",
    "create_token_pair",
    "get_current_user",
    "get_current_user_from_refresh_token",
    "get_current_user_or_demo",
    "add_token_to_blacklist",
    "is_token_blacklisted",
    "get_token_blacklist",
]
