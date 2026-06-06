from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, timedelta
import stripe
import os
import hmac
import hashlib
import json
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user_or_demo as get_current_user
from app.models.user import User
from app.models.subscription import Subscription, SubscriptionTier, SubscriptionStatus

router = APIRouter(tags=["billing"])

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY_TEST") or os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET_TEST") or os.getenv("STRIPE_WEBHOOK_SECRET")

# Stripe pricing constants
STRIPE_PRICES = {
    "free": os.getenv("STRIPE_PRICE_FREE", "price_free_lbh_test"),
    "pro_monthly": os.getenv("STRIPE_PRICE_PRO_MONTHLY", "price_pro_monthly_usd_test"),
    "pro_annual": os.getenv("STRIPE_PRICE_PRO_ANNUAL", "price_pro_annual_usd_test"),
    "enterprise": os.getenv("STRIPE_PRICE_ENTERPRISE", "price_enterprise_custom_test"),
}

TRIAL_DAYS = 14


def get_or_create_stripe_customer(user: User, db: Session) -> str:
    """Get or create Stripe customer for user."""
    # Check if user already has a subscription with stripe_customer_id
    subscription = db.query(Subscription).filter(
        Subscription.user_id == user.id
    ).first()

    if subscription and subscription.stripe_customer_id:
        return subscription.stripe_customer_id

    # Create new Stripe customer
    try:
        customer = stripe.Customer.create(
            email=user.email,
            name=user.full_name or user.email,
            metadata={"user_id": str(user.id)},
        )
        return customer.id
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Failed to create Stripe customer: {str(e)}"
        )


@router.post("/billing/create-subscription")
async def create_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create Pro subscription with 14-day free trial.
    Credit card required but not charged until Day 15.
    """
    try:
        # Check if user already has active subscription
        existing = db.query(Subscription).filter(
            and_(
                Subscription.user_id == current_user.id,
                Subscription.status != SubscriptionStatus.canceled
            )
        ).first()

        if existing and existing.tier == SubscriptionTier.pro:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already has an active Pro subscription"
            )

        # Get or create Stripe customer
        stripe_customer_id = get_or_create_stripe_customer(current_user, db)

        # Create subscription with trial
        subscription = stripe.Subscription.create(
            customer=stripe_customer_id,
            items=[
                {
                    "price": STRIPE_PRICES["pro_monthly"],
                }
            ],
            trial_period_days=TRIAL_DAYS,
            trial_settings={"end_behavior": {"missing_payment_method": "cancel"}},
            metadata={
                "user_id": str(current_user.id),
                "product_tier": "pro",
            },
        )

        # Calculate trial end date
        trial_end = datetime.utcnow() + timedelta(days=TRIAL_DAYS)

        # Store subscription in database
        db_subscription = Subscription(
            user_id=current_user.id,
            stripe_customer_id=stripe_customer_id,
            stripe_subscription_id=subscription.id,
            tier=SubscriptionTier.pro,
            status=SubscriptionStatus.trialing,
            is_trial_active=True,
            trial_ends_at=trial_end,
            current_period_start=datetime.utcfromtimestamp(subscription.current_period_start),
            current_period_end=datetime.utcfromtimestamp(subscription.current_period_end),
        )

        # Delete any existing free subscription
        db.query(Subscription).filter(
            and_(
                Subscription.user_id == current_user.id,
                Subscription.tier == SubscriptionTier.free
            )
        ).delete()

        db.add(db_subscription)
        db.commit()
        db.refresh(db_subscription)

        return {
            "status": "success",
            "subscription_id": subscription.id,
            "tier": "pro",
            "trial_ends_at": trial_end.isoformat(),
            "message": f"Pro trial active! Your card will be charged ${19.00} on {trial_end.strftime('%B %d, %Y')}",
        }

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Payment processing failed: {str(e)}"
        )


@router.get("/billing/subscription")
async def get_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current user's subscription status."""
    subscription = db.query(Subscription).filter(
        Subscription.user_id == current_user.id
    ).first()

    if not subscription:
        return {
            "tier": "free",
            "status": "none",
            "message": "No active subscription. Upgrade to Pro to unlock advanced features.",
        }

    is_trial = subscription.is_trial_active and subscription.trial_ends_at

    return {
        "subscription_id": subscription.stripe_subscription_id,
        "tier": subscription.tier,
        "status": subscription.status,
        "is_trial_active": is_trial,
        "trial_ends_at": subscription.trial_ends_at.isoformat() if is_trial else None,
        "current_period_end": subscription.current_period_end.isoformat() if subscription.current_period_end else None,
        "created_at": subscription.created_at.isoformat(),
    }


@router.post("/billing/cancel-subscription")
async def cancel_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel user's Pro subscription and downgrade to Free tier."""
    try:
        subscription = db.query(Subscription).filter(
            Subscription.user_id == current_user.id
        ).first()

        if not subscription or not subscription.stripe_subscription_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active subscription found"
            )

        # Cancel in Stripe
        stripe.Subscription.delete(subscription.stripe_subscription_id)

        # Update database
        subscription.status = SubscriptionStatus.canceled
        subscription.tier = SubscriptionTier.free
        subscription.canceled_at = datetime.utcnow()
        subscription.is_trial_active = False

        db.commit()

        return {
            "status": "success",
            "message": "Subscription canceled. Your Pro features will be disabled at the end of your billing period.",
        }

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Failed to cancel subscription: {str(e)}"
        )


@router.post("/billing/webhook")
async def handle_stripe_webhook(
    request_body: bytes = None,
    stripe_signature: str = Header(None),
    db: Session = Depends(get_db),
):
    """
    Handle Stripe webhook events.
    Validates signature and processes subscription/payment events.
    """
    if not stripe_signature or not request_body:
        raise HTTPException(status_code=400, detail="Missing signature or body")

    try:
        event = stripe.Webhook.construct_event(
            request_body, stripe_signature, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event["type"]

    # Handle subscription created (trial started)
    if event_type == "customer.subscription.created":
        subscription = event["data"]["object"]
        user_id = subscription["metadata"].get("user_id")

        if user_id:
            db_subscription = db.query(Subscription).filter(
                Subscription.user_id == int(user_id)
            ).first()

            if db_subscription:
                db_subscription.status = SubscriptionStatus.trialing
                db_subscription.is_trial_active = True
                db.commit()

    # Handle subscription updated (trial ended, charge succeeded)
    elif event_type == "customer.subscription.updated":
        subscription = event["data"]["object"]
        user_id = subscription["metadata"].get("user_id")

        if user_id:
            db_subscription = db.query(Subscription).filter(
                Subscription.user_id == int(user_id)
            ).first()

            if db_subscription:
                # Trial ended, now active
                if subscription.get("status") == "active":
                    db_subscription.status = SubscriptionStatus.active
                    db_subscription.is_trial_active = False
                    db_subscription.current_period_start = datetime.utcfromtimestamp(
                        subscription["current_period_start"]
                    )
                    db_subscription.current_period_end = datetime.utcfromtimestamp(
                        subscription["current_period_end"]
                    )
                elif subscription.get("status") == "past_due":
                    db_subscription.status = SubscriptionStatus.past_due
                elif subscription.get("status") == "canceled":
                    db_subscription.status = SubscriptionStatus.canceled
                    db_subscription.canceled_at = datetime.utcnow()

                db.commit()

    # Handle payment succeeded (charge went through)
    elif event_type == "invoice.payment_succeeded":
        invoice = event["data"]["object"]
        customer_id = invoice.get("customer")

        if customer_id:
            subscription = db.query(Subscription).filter(
                Subscription.stripe_customer_id == customer_id
            ).first()

            if subscription:
                subscription.status = SubscriptionStatus.active
                subscription.is_trial_active = False
                db.commit()

    # Handle payment failed (charge declined)
    elif event_type == "invoice.payment_failed":
        invoice = event["data"]["object"]
        customer_id = invoice.get("customer")

        if customer_id:
            subscription = db.query(Subscription).filter(
                Subscription.stripe_customer_id == customer_id
            ).first()

            if subscription:
                subscription.status = SubscriptionStatus.past_due
                db.commit()

    # Handle subscription deleted (cancellation finalized)
    elif event_type == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        user_id = subscription["metadata"].get("user_id")

        if user_id:
            db_subscription = db.query(Subscription).filter(
                Subscription.user_id == int(user_id)
            ).first()

            if db_subscription:
                db_subscription.status = SubscriptionStatus.canceled
                db_subscription.canceled_at = datetime.utcnow()
                db.commit()

    return {"status": "received"}


@router.get("/billing/feature-access")
async def check_feature_access(
    feature: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Check if user has access to a specific feature.
    Returns boolean indicating access level.
    """
    subscription = db.query(Subscription).filter(
        Subscription.user_id == current_user.id
    ).first()

    tier = subscription.tier if subscription else SubscriptionTier.free

    # Define feature access matrix
    features = {
        # Screening features
        "unlimited_screening": tier in [SubscriptionTier.pro, SubscriptionTier.enterprise],
        "advanced_screening": tier in [SubscriptionTier.pro, SubscriptionTier.enterprise],

        # Backtest features
        "backtesting": tier in [SubscriptionTier.pro, SubscriptionTier.enterprise],
        "multiple_backtests": tier in [SubscriptionTier.pro, SubscriptionTier.enterprise],
        "monte_carlo": tier in [SubscriptionTier.pro, SubscriptionTier.enterprise],

        # Portfolio features
        "multiple_portfolios": tier in [SubscriptionTier.pro, SubscriptionTier.enterprise],
        "portfolio_export": tier in [SubscriptionTier.pro, SubscriptionTier.enterprise],

        # Alert features
        "price_alerts": tier in [SubscriptionTier.pro, SubscriptionTier.enterprise],
        "advanced_alerts": tier == SubscriptionTier.enterprise,

        # Support & export
        "pdf_export": tier in [SubscriptionTier.pro, SubscriptionTier.enterprise],
        "csv_export": tier in [SubscriptionTier.free, SubscriptionTier.pro, SubscriptionTier.enterprise],
        "email_support": tier in [SubscriptionTier.pro, SubscriptionTier.enterprise],
        "priority_support": tier == SubscriptionTier.enterprise,

        # Enterprise-only
        "api_access": tier == SubscriptionTier.enterprise,
        "white_label": tier == SubscriptionTier.enterprise,
        "sso": tier == SubscriptionTier.enterprise,
    }

    has_access = features.get(feature, False)

    return {
        "feature": feature,
        "tier": tier,
        "has_access": has_access,
    }

