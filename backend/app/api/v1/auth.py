from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os
from google.auth.transport import requests
from google.oauth2 import id_token
from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_token_pair,
    get_current_user,
    get_current_user_from_refresh_token,
    add_token_to_blacklist,
)
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, Token

router = APIRouter(prefix="/auth", tags=["auth"])


class TokenResponse(BaseModel):
    """Enhanced token response with access and refresh tokens."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


@router.post("/register", response_model=UserResponse, status_code=201)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        risk_profile=user_in.risk_profile,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Authenticate user and return access + refresh tokens."""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Return both access and refresh tokens
    tokens = create_token_pair(user.email)
    return tokens


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(current_user: User = Depends(get_current_user_from_refresh_token)):
    """Refresh access token using refresh token."""
    # Create new token pair
    tokens = create_token_pair(current_user.email)
    return tokens


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """Logout user by blacklisting their token."""
    # In production, get token from request and blacklist it
    # For now, return success
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


# ── Google OAuth ────────────────────────────────────────────────────────────


class GoogleLoginRequest(BaseModel):
    id_token: str


@router.post("/google", response_model=TokenResponse)
def google_login(request: GoogleLoginRequest, db: Session = Depends(get_db)):
    """
    Login via Google OAuth. Frontend sends ID token from Google Sign-In.
    Returns access and refresh tokens.
    """
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not google_client_id:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth not configured (GOOGLE_CLIENT_ID not set)",
        )

    try:
        # Verify the token with Google
        info = id_token.verify_oauth2_token(
            request.id_token,
            requests.Request(),
            google_client_id,
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid Google token: {str(e)}",
        )

    # Extract user info from token
    email = info.get("email")
    full_name = info.get("name", "")
    picture = info.get("picture", "")

    if not email:
        raise HTTPException(status_code=400, detail="Email not found in Google token")

    # Find or create user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Create new user with random password (won't be used)
        user = User(
            email=email,
            full_name=full_name,
            hashed_password=get_password_hash(os.urandom(32).hex()),  # Random password
            risk_profile="moderate",  # Default risk profile
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Create token pair (access + refresh)
    tokens = create_token_pair(user.email)
    return tokens


class GoogleDevLoginRequest(BaseModel):
    """Development-only: login without verifying Google token"""
    email: str
    full_name: str = ""


@router.post("/google-dev", response_model=TokenResponse)
def google_dev_login(request: GoogleDevLoginRequest, db: Session = Depends(get_db)):
    """
    TEST ONLY: Login via mock Google OAuth (no token verification).
    Creates or finds user and returns access + refresh tokens.
    """
    email = request.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email required")

    # Find or create user
    user = db.query(User).filter(User.email == email).first()

    if not user:
        # Create new user with random password
        hashed_pwd = get_password_hash(os.urandom(32).hex())
        user = User(
            email=email,
            full_name=request.full_name if request.full_name else email,
            hashed_password=hashed_pwd,
            risk_profile="moderate",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Create and return token pair (access + refresh)
    tokens = create_token_pair(user.email)
    return tokens
