# STRIPE INTEGRATION — TECHNICAL SPECIFICATIONS
## LBH System Payment Processing (Week 2-3 Implementation)

**Date:** June 12, 2026  
**Owner:** Backend Lead + Finance Lead  
**Status:** SPECIFICATION PHASE (Ready for engineering review)  
**Target Implementation:** Week 3 (June 24-28)  
**Go-Live:** June 28, 2026  

---

## EXECUTIVE SUMMARY

This document specifies the Stripe integration architecture for LBH System's Freemium monetization model (Free + Pro $19/mo + Enterprise custom).

**Integration Scope:**
- ✅ Subscription management (Pro monthly + annual)
- ✅ 14-day free trial (credit card required, charges Day 15)
- ✅ Enterprise billing (monthly + annual, custom amounts)
- ✅ Payment method handling (card, Apple Pay, Google Pay)
- ✅ Dunning/failed payment retries
- ✅ Webhook integration (trigger Pro feature access)
- ✅ Refund handling (7-day free period refunds)
- ✅ Invoice generation & email delivery
- ✅ Analytics dashboard (MRR tracking)

**Out of Scope (Phase 2):**
- ❌ Usage-based billing (implement Q3)
- ❌ Seats/multi-user management (implement Q4)
- ❌ Revenue recognition automation (manual for now)
- ❌ Dunning machine learning (use Stripe defaults)

---

## 1. STRIPE ACCOUNT SETUP

### 1.1 Account Creation & Configuration

**Status:** ⏳ TO-DO (Day 1)  
**Owner:** Finance Lead + Backend Lead  

**Steps:**
1. Create Stripe account (if not already created)
   - Email: [finance@lbhsystem.com]
   - Business name: LBH System
   - Industry: Financial Services - Investment Tool
   - URL: https://lbhsystem.com (production) / https://staging.lbhsystem.com
   
2. Complete Stripe onboarding:
   - Legal entity: [TBD - Brazilian company or US C-Corp?]
   - Bank account for payouts (Brazil: Nubank or InterBank; US: Chase)
   - Tax ID (CNPJ if Brazil, EIN if US)
   
3. Enable required features:
   - [ ] Subscriptions (recurring billing)
   - [ ] Payment intents (Stripe's recommended payment API)
   - [ ] 3D Secure (for security, enables higher card limits)
   - [ ] Radar (fraud detection; recommended)
   - [ ] Billing (invoicing + email)
   - [ ] Webhooks (to trigger backend events)
   - [ ] Tax calculation (optional; for compliance)

4. Payout settings:
   - Frequency: **Daily** (important for cash flow visibility)
   - Minimum balance: $100 USD (recommended)
   - Payout window: ACH 1-3 days (or same-day wire if available)

---

### 1.2 API Keys & Secrets

**Staging (Test Mode):**
- Publishable key: `pk_test_...` (use in frontend)
- Secret key: `sk_test_...` (use in backend only; store in .env)
- Webhook signing secret: `whsec_test_...` (backend)

**Production:**
- Publishable key: `pk_live_...` (use in frontend)
- Secret key: `sk_live_...` (use in backend; stored in secure vault/Heroku config)
- Webhook signing secret: `whsec_live_...` (backend)

**Setup process:**
- [ ] Backend stores keys in `.env` (staging) and production config (GitHub secrets / Render env vars)
- [ ] Frontend uses publishable key (safe to expose; domain-restricted)
- [ ] Never commit secret key to Git
- [ ] Rotate keys if compromised

---

## 2. PRODUCT & PRICING CONFIGURATION

### 2.1 Stripe Products

Create 4 products in Stripe dashboard:

**Product 1: Free Tier**
- **Name:** LBH System - Free
- **Type:** Service
- **Default price:** $0/month (one-time; no billing)
- **Purpose:** Track free users; disable paid features
- **Stripe Price ID:** `price_free_lbh` (use in API)

**Product 2: Pro Monthly**
- **Name:** LBH System - Pro
- **Type:** Service
- **Price:** $19.00 USD/month
- **Billing cycle:** Monthly (every 30 days)
- **Trial period:** 14 days (auto-configuration in subscription)
- **Stripe Price ID:** `price_pro_monthly_usd`
- **Metadata:**
  ```json
  {
    "product_tier": "pro",
    "features": ["unlimited_screening", "10_backtests_month", "monte_carlo", "alerts"],
    "billing_period": "monthly"
  }
  ```

**Product 3: Pro Annual** *(Launch Q3 2026)*
- **Name:** LBH System - Pro Annual
- **Type:** Service
- **Price:** $180.00 USD/year (10% discount)
- **Billing cycle:** Yearly (every 365 days)
- **Trial period:** 14 days
- **Stripe Price ID:** `price_pro_annual_usd`
- **Metadata:** Same as above, `"billing_period": "annual"`

**Product 4: Enterprise** *(Custom)*
- **Name:** LBH System - Enterprise
- **Type:** Service
- **Pricing:** Custom per customer (no fixed price in Stripe; use per-seat or flat fee)
- **Billing cycle:** Monthly or yearly (negotiated)
- **Trial period:** None; sales-driven
- **Stripe Price ID:** N/A (create price per customer at signup)
- **Metadata:**
  ```json
  {
    "product_tier": "enterprise",
    "features": ["api_access", "white_label", "dedicated_support", "sla_999"],
    "billing_period": "custom",
    "requires_sales_approval": true
  }
  ```

---

### 2.2 Stripe Coupons & Promotions

**Coupon 1: Early Adopter Discount** *(optional, Month 2-3)*
- **Name:** EARLYBIRD20
- **Type:** Percentage discount
- **Discount:** 20% off Pro monthly ($19 → $15.20)
- **Duration:** 3 months (duration_in_months = 3)
- **Max redemptions:** 100 uses
- **Expires:** July 31, 2026
- **Purpose:** Increase conversion in beta phase

**Coupon 2: Annual Prepay Discount** *(Q3 2026)*
- **Name:** ANNUAL10
- **Type:** Percentage discount
- **Discount:** 10% off (implicit in annual price $180 vs $228)
- **Duration:** Forever
- **Purpose:** Promote annual signups; improve LTV

---

## 3. SUBSCRIPTION & TRIAL CONFIGURATION

### 3.1 Free Trial Setup

**Trial Logic:**
```
User signup (Day 0)
→ Create Stripe subscription with 14-day trial
→ Credit card tokenized (NOT charged yet)
→ Grant Pro features for 14 days
→ Day 14: Send "Trial Ending" reminder email
→ Day 15: Auto-charge card for first month
→ If charge fails: Enter dunning flow (retry 3x)
```

**Stripe Configuration:**
- Trial period: 14 days (default)
- Billing cycle anchor: Set to Day 15 after signup
- Automatic tax: Enabled (Stripe tax calculation on charges)
- Description: `LBH System Pro - 14 day trial`

**Implementation (Backend API):**
```python
import stripe

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

def create_pro_subscription_with_trial(user_id, email, card_token):
    """
    Creates a Pro subscription with 14-day free trial.
    Charge on Day 15.
    """
    subscription = stripe.Subscription.create(
        customer=create_or_get_stripe_customer(user_id, email),
        items=[
            {
                "price": "price_pro_monthly_usd",  # $19/month
            }
        ],
        trial_period_days=14,
        payment_behavior="error_if_incomplete",  # Fail if card invalid
        expand=["latest_invoice.payment_intent"],
        metadata={
            "lbh_user_id": user_id,
            "trial_start_date": datetime.now().isoformat(),
        }
    )
    
    return subscription
```

---

### 3.2 Customer Object Mapping

**Stripe Customer Object:**
```json
{
  "id": "cus_XXXXX",  // Stripe customer ID
  "email": "user@example.com",
  "name": "João Silva",
  "metadata": {
    "lbh_user_id": "12345",
    "lbh_signup_date": "2026-06-15",
    "lbh_tier": "pro",
    "lbh_country": "BR"
  },
  "description": "LBH User: João Silva (User ID: 12345)",
  "address": {
    "country": "BR"  // For tax purposes
  },
  "phone": "+55 11 98765-4321"  // Optional
}
```

**Backend Storage (PostgreSQL):**
```sql
CREATE TABLE stripe_customers (
    id SERIAL PRIMARY KEY,
    lbh_user_id INT NOT NULL REFERENCES users(id),
    stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    lbh_user_id INT NOT NULL REFERENCES users(id),
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_product_id VARCHAR(255),  -- "price_pro_monthly_usd"
    status VARCHAR(50),  -- "active", "past_due", "canceled", "trialing"
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,
    cancel_at TIMESTAMP,
    canceled_at TIMESTAMP,
    cancellation_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 4. PAYMENT METHODS & CHECKOUT

### 4.1 Payment Collection

**Recommended: Stripe Payment Element** *(Frontend)*

Use Stripe's Payment Element for PCI compliance + multi-method support:

```javascript
// In React/Vue frontend
import { Elements, Payment Element, useElements, useStripe } from "@stripe/react-stripe-js";

function CheckoutForm({ trialDays = 14 }) {
  const stripe = useStripe();
  const elements = useElements();

  async function handleSubmit(e) {
    e.preventDefault();

    // Confirm payment (either charges immediately or starts trial)
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: "https://lbhsystem.com/checkout/success",
      },
    });

    if (error) {
      console.error(error.message);
    } else if (paymentIntent.status === "succeeded") {
      // Trial started or first charge successful
      updateUserSubscriptionStatus(userId, "pro");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Payment Element />
      <button type="submit">Start {trialDays}-day Free Trial</button>
    </form>
  );
}
```

**Supported Payment Methods:**
- ✅ Credit/Debit cards (Visa, MasterCard, Amex)
- ✅ Apple Pay
- ✅ Google Pay
- ✅ Boleto (Brazil-specific; via Stripe gateway)
- ✅ PIX (Brazil-specific; via Stripe gateway) **[Phase 2]**
- ❌ Bank transfer (available but not initial launch)

**3D Secure:**
- Enabled for cards >$50 or high-risk regions
- Automatic via Stripe (no code needed)
- User redirected to issuing bank for verification

---

### 4.2 Card Validation & Tokenization

**Stripe.js Handling:**
- Frontend collects card via Payment Element
- Stripe tokenizes card (creates token_XXXXX)
- Backend receives token (never sees raw card data)
- Token used to create subscription

**No PCI Compliance Burden:**
- ✅ You never handle raw card data
- ✅ Stripe handles PCI DSS compliance
- ✅ Only store Stripe customer ID + subscription ID

---

## 5. INVOICE & BILLING CONFIGURATION

### 5.1 Invoicing Settings

**Invoice Template:**
- **Company:** LBH System
- **Address:** [Registered address - TBD]
- **Logo:** [Company logo]
- **Invoice number format:** INV-2026-{sequence}
- **Terms:** Due on receipt (payment auto-charged)
- **Footer:** "Thank you for your business. Support: support@lbhsystem.com"

**Stripe Configuration (Dashboard):**
- [ ] Upload company logo
- [ ] Set invoice number format
- [ ] Enable automatic invoice emails
- [ ] Set invoice email template

**Automatic Invoice Emails:**
- Sent to customer email on Day 15 (first charge)
- Subsequent invoices sent on billing anniversary
- Email template includes:
  - Invoice number + date
  - Service period (e.g., "June 15 - July 14, 2026")
  - Amount charged ($19.00)
  - Payment method (last 4 digits of card)
  - Cancellation link (if applicable)

---

### 5.2 Refund & Cancellation Policy

**7-Day Money-Back Guarantee:**
```
If Pro user cancels within 7 days of first charge,
refund $19 automatically (full refund).
After 7 days: Month-to-month billing;
cancel anytime, charges stop on cancellation date.
```

**Implementation (Backend):**
```python
def handle_refund_request(user_id, subscription_id):
    """
    Issues refund if within 7 days of first charge.
    """
    subscription = stripe.Subscription.retrieve(subscription_id)
    first_invoice = stripe.Invoice.list(
        subscription=subscription_id,
        limit=1
    ).data[0]
    
    days_since_charge = (datetime.now() - first_invoice.created).days
    
    if days_since_charge <= 7:
        # Issue refund
        refund = stripe.Refund.create(
            charge=first_invoice.charge,
            reason="requested_by_customer",
            metadata={"lbh_user_id": user_id}
        )
        # Mark subscription as canceled
        stripe.Subscription.modify(subscription_id, cancel_at_period_end=True)
        return refund
    else:
        # Regular cancellation (no refund)
        stripe.Subscription.delete(subscription_id)
        return {"status": "canceled", "refund": None}
```

**Cancellation Flow:**
1. User clicks "Cancel subscription" in app
2. Backend checks: within 7 days? → Yes: issue refund; No: schedule cancel
3. Stripe email: Cancellation confirmation + refund confirmation (if applicable)
4. Backend: Disable Pro features immediately on cancel request

---

## 6. WEBHOOK INTEGRATION

### 6.1 Webhook Events to Handle

**Critical events (must handle):**

| Event | Action | Backend Update |
|-------|--------|--------|
| `customer.created` | New customer signed up | Log to DB |
| `customer.updated` | Email/metadata changed | Update customer record |
| `customer.deleted` | Customer removed (rare) | Mark user as churned |
| `charge.succeeded` | Payment successful | Update subscription status; grant Pro features |
| `charge.failed` | Payment failed | Enter dunning flow; notify user |
| `invoice.created` | Invoice generated | Log to DB |
| `invoice.finalized` | Invoice ready to pay | Send email to customer |
| `invoice.payment_succeeded` | Invoice paid | Update subscription; grant features |
| `invoice.payment_failed` | Invoice payment failed | Retry logic (handled by Stripe dunning) |
| `customer.subscription.created` | Subscription started | Create subscription record; log trial start |
| `customer.subscription.updated` | Subscription changed (pause, resume, price change) | Update subscription status |
| `customer.subscription.trial_will_end` | Trial ending in 3 days | Send reminder email to user |
| `customer.subscription.deleted` | Subscription canceled | Disable Pro features; mark user as churned |

---

### 6.2 Webhook Endpoint Implementation

**Endpoint:**
```
POST https://api.lbhsystem.com/webhooks/stripe
```

**Security:**
- Verify webhook signature (using `whsec_...` secret)
- Only accept POST requests
- Implement idempotency (if same event received twice, process once)

**Python/FastAPI Implementation:**
```python
import os
import stripe
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

app = FastAPI()

STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

@app.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhook events.
    Verify signature, then process event.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle specific events
    if event["type"] == "charge.succeeded":
        handle_charge_succeeded(event["data"]["object"])
    elif event["type"] == "charge.failed":
        handle_charge_failed(event["data"]["object"])
    elif event["type"] == "customer.subscription.created":
        handle_subscription_created(event["data"]["object"])
    elif event["type"] == "customer.subscription.deleted":
        handle_subscription_deleted(event["data"]["object"])
    elif event["type"] == "customer.subscription.trial_will_end":
        handle_trial_will_end(event["data"]["object"])
    else:
        print(f"Unhandled event type: {event['type']}")

    return JSONResponse({"status": "success"}, status_code=200)

def handle_charge_succeeded(charge):
    """Grant Pro features when payment succeeds."""
    subscription_id = charge.get("metadata", {}).get("subscription_id")
    customer = stripe.Customer.retrieve(charge.customer)
    lbh_user_id = customer.metadata.get("lbh_user_id")

    # Update database
    update_subscription_status(lbh_user_id, "active")
    grant_pro_features(lbh_user_id)  # Enable Pro in app

    print(f"User {lbh_user_id} charge succeeded; Pro features granted")

def handle_charge_failed(charge):
    """Notify user of failed payment; Stripe handles retry."""
    customer = stripe.Customer.retrieve(charge.customer)
    lbh_user_id = customer.metadata.get("lbh_user_id")
    
    # Send email to user
    send_payment_failed_email(lbh_user_id, charge.failure_message)
    
    print(f"User {lbh_user_id} payment failed; retry email sent")

def handle_subscription_deleted(subscription):
    """Revoke Pro features when subscription canceled."""
    customer = stripe.Customer.retrieve(subscription.customer)
    lbh_user_id = customer.metadata.get("lbh_user_id")

    # Update database
    update_subscription_status(lbh_user_id, "canceled")
    revoke_pro_features(lbh_user_id)  # Disable Pro in app

    print(f"User {lbh_user_id} subscription deleted; Pro features revoked")

def handle_trial_will_end(subscription):
    """Send reminder email 3 days before trial ends."""
    customer = stripe.Customer.retrieve(subscription.customer)
    lbh_user_id = customer.metadata.get("lbh_user_id")
    
    send_trial_ending_email(lbh_user_id, subscription.trial_end)
    
    print(f"User {lbh_user_id} trial ending soon; reminder sent")
```

---

### 6.3 Webhook Event Delivery & Monitoring

**Stripe Dashboard:**
- [ ] Configure webhook endpoint: https://api.lbhsystem.com/webhooks/stripe
- [ ] Select events to listen for (see table above)
- [ ] Test webhook delivery (Stripe provides "Send test webhook" button)
- [ ] Monitor webhook logs in Stripe dashboard

**Backend Monitoring:**
- Log all webhook events to database (for audit trail)
- Set up alerts if webhooks fail (email to ops)
- Implement retry logic (store failed webhooks, retry hourly)

---

## 7. DUNNING & FAILED PAYMENT HANDLING

### 7.1 Automatic Retry Configuration

**Stripe Automatic Dunning:**
- ✅ Enabled by default (Stripe 2-stage dunning)
- Retry schedule:
  - Day 1: Automatic retry (15 minutes after failure)
  - Day 3: Second retry attempt
  - Day 5: Third & final retry
  - Day 8: Subscription marked as past_due (Pro features disabled)

**Backend Handling:**
```python
def check_subscription_status_and_grant_access(user_id):
    """
    Check subscription status;
    grant or revoke Pro features accordingly.
    """
    subscription = get_user_subscription(user_id)
    
    if subscription.status == "active" or subscription.status == "trialing":
        grant_pro_features(user_id)
    elif subscription.status == "past_due":
        # Payment failed; Pro features disabled
        revoke_pro_features(user_id)
        send_payment_failed_alert(user_id)
    elif subscription.status == "canceled":
        # Subscription canceled; Pro features disabled
        revoke_pro_features(user_id)
    else:
        revoke_pro_features(user_id)
```

---

### 7.2 User Communication During Dunning

**Email 1 (Day 1, immediate):** Payment Failed
```
Subject: Payment Failed for LBH Pro Subscription

Hi [Name],

We tried to charge your card for your LBH Pro subscription ($19/month),
but the payment failed.

Reason: [Decline reason]

We'll automatically retry on [Date].

In the meantime, your Pro features remain active until [Date].

→ Update payment method: [Link to settings]

Questions? Reply to this email.

—The LBH Team
```

**Email 2 (Day 3, if still failed):** Retry Notice
```
Subject: LBH Pro — Payment Retry Tomorrow

Hi [Name],

We'll retry charging your card tomorrow.

If this fails, your Pro features will be disabled until payment succeeds.

→ Update payment method now: [Link]

—The LBH Team
```

**Email 3 (Day 8, final):** Pro Features Disabled
```
Subject: LBH Pro Features Disabled

Hi [Name],

We couldn't charge your card after 3 attempts.
Your Pro features are now disabled.

You can reactivate Pro anytime by updating your payment method:
→ [Link]

We still have your Pro data saved; no data loss.

—The LBH Team
```

---

## 8. FINANCIAL OPERATIONS & RECONCILIATION

### 8.1 Daily Payout & Cash Flow

**Stripe Payouts:**
- Frequency: Daily
- Minimum: $100 USD (batched if lower)
- Settlement: ACH 1-3 days
- Stripe fee: 2.9% + $0.30 per successful charge

**Reconciliation Process (Finance Lead):**
```
Daily (EOD):
1. Export Stripe dashboard: Payments → Balance transfers
2. Match payout amount to bank deposit (lag 1-3 days)
3. Log in accounting software (QuickBooks / Xero)
4. Reconcile: Stripe payout - Stripe fees = Net cash received

Monthly:
1. Generate Stripe tax report (by transaction)
2. File sales tax (if applicable; for now, assume B2B)
3. Record revenue: MRR from active subscriptions
4. Revenue recognition: Pro users × $19 × months (even in trial)
5. Churn analysis: track cancellations + reasons
```

### 8.2 Revenue Recognition (Accounting)

**For SaaS, revenue recognized ratably:**
```
User subscribes: Pro 14-day trial starting June 15
Day 15 (first charge): Record $19 revenue for June 15 - July 15
Day 15 (July): Record $19 revenue for July 15 - Aug 15
If canceled Day 20: No adjustment (revenue already recognized)
If refunded (day 7): Reverse $19 revenue for that month
```

**Monthly Revenue Report (Finance):**
```
LBH System — June 2026 Revenue Summary

Pro Monthly Subscriptions:
- New: 35 users
- Churned: 2 users
- Active (end of month): 33 users
- MRR: $627 ($19 × 33)
- Gross profit (70%): $438.90

Enterprise:
- New: 0 customers
- Churned: 0
- Active: 0
- MRR: $0

Total MRR (June 30): $627
Month-over-month growth: —% (baseline)
Churn: 5.7% (2/35)
```

---

## 9. TESTING & LAUNCH CHECKLIST

### 9.1 Staging Environment Testing (Week 2)

**Setup:**
- [ ] Stripe test account created
- [ ] Test API keys in `.env.staging`
- [ ] Staging database connected
- [ ] Webhooks pointed to staging endpoint

**Test Cases (Backend + Frontend):**
- [ ] User signs up → Stripe customer created ✓
- [ ] Pro signup flow → 14-day trial starts ✓
- [ ] Test card ($4242...) charges on Day 15 ✓
- [ ] Payment succeeds → Pro features granted ✓
- [ ] Payment fails (test card: $4000...) → dunning flow ✓
- [ ] Refund request (within 7 days) → refund issued ✓
- [ ] Cancellation → subscription deleted, Pro revoked ✓
- [ ] Webhook events received & logged ✓
- [ ] Email notifications sent (trial ending, payment failed, etc.) ✓
- [ ] Enterprise custom pricing → custom price created in Stripe ✓

**Test Users:**
- Create 3 test users in staging:
  1. "test_success@example.com" (payment succeeds)
  2. "test_decline@example.com" (payment declines; card $4000...)
  3. "test_refund@example.com" (refund within 7 days)

---

### 9.2 Production Launch Checklist (Week 3)

**Before Go-Live:**
- [ ] Stripe live account fully configured
- [ ] Live API keys in production secrets (GitHub Actions / Render env vars)
- [ ] Production database populated with live customer records
- [ ] Webhook endpoint updated to production URL
- [ ] Invoice template finalized & uploaded to Stripe
- [ ] Support team trained on subscription management
- [ ] Finance team trained on payout reconciliation
- [ ] Legal review: TOS updated with billing terms

**Day of Launch (June 28):**
- [ ] Pricing page goes live on production
- [ ] Stripe integration live (Pro subscription available)
- [ ] Email templates sent to test users
- [ ] Monitor webhook logs (should see test customers)
- [ ] Verify first test payment succeeds
- [ ] Check bank deposit (test transfer)

**Post-Launch (Week 1):**
- [ ] Finance reconciles first revenue ($0 expected; trial users)
- [ ] Growth measures signup → trial conversion rate
- [ ] Backend monitors webhook health
- [ ] Support responds to any billing questions

---

## 10. MONITORING & ANALYTICS

### 10.1 Stripe Dashboard Metrics

**Daily Monitor (Finance + Growth):**
- MRR: https://dashboard.stripe.com/reports/dashboard
- Subscriptions: https://dashboard.stripe.com/subscriptions
- Revenue: https://dashboard.stripe.com/revenue
- Churn: Custom export from Stripe (monthly)

**Weekly Reports:**
```
Week 1 (Jun 28 - Jul 4):
- New Pro signups: X
- Trial conversions (Day 15): X
- Failed payments: X
- Refunds: X
- Churn: X%
- MRR: $X
- Notes: [Any anomalies?]
```

---

### 10.2 Backend Metrics (Custom Dashboard)

**Track these metrics in your app analytics:**
```
Daily:
- Free users → Pro trial started (count)
- Pro trial → Auto-charge Day 15 (count)
- Successful charges (count + amount)
- Failed charges (count + reason)
- Refunds (count + amount)
- Subscription status (active / past_due / canceled)

Monthly:
- Cohort analysis: Conversion rate by signup week
- Churn cohort: % retained by month
- LTV calculation: Average lifetime revenue per user
- CAC payback: Months to break even per cohort
```

---

## 11. ENTERPRISE BILLING (Custom Pricing)

### 11.1 Enterprise Subscription Flow

**Sales → Finance → Backend:**
1. **Sales closes enterprise deal** (e.g., $299/mo or $5k/year)
2. **Finance sends pricing to backend:** `price_enterprise_ana_advisor_usd` (custom price)
3. **Backend creates custom Stripe product:**
   ```python
   # Create custom price for enterprise customer
   price = stripe.Price.create(
       product="prod_enterprise_lbh",
       currency="usd",
       unit_amount=29900,  # $299.00 in cents
       recurring={
           "interval": "month",
           "interval_count": 1,
       },
       metadata={
           "customer_name": "Ana Advisor",
           "deal_id": "DEAL-001",
           "arpu": "299",
       }
   )
   ```
4. **Backend creates subscription with custom price:**
   ```python
   subscription = stripe.Subscription.create(
       customer=enterprise_stripe_customer_id,
       items=[{"price": price.id}],
       billing_cycle_anchor=first_billing_date,
   )
   ```
5. **Stripe invoices monthly; backend tracks MRR**

---

## 12. SECURITY & COMPLIANCE

### 12.1 PCI Compliance

✅ **You are PCI-compliant by design:**
- Never store raw card data
- Use Stripe Payment Element (Stripe handles PCI)
- Store only Stripe customer ID + subscription ID
- Assume Stripe handles all PCI requirements

---

### 12.2 Data Privacy

**Stripe stores:**
- Customer email
- Card last 4 digits
- Billing address
- Invoice history

**Backend stores:**
- Stripe customer ID (unique reference)
- Subscription status
- Trial dates
- Churn reason (if canceled)

**GDPR/LGPD compliance:**
- [ ] Privacy policy mentions Stripe data sharing
- [ ] User can request data deletion (triggers Stripe customer delete)
- [ ] Data retention: Keep subscription history for 7 years (tax)

---

## 13. IMPLEMENTATION TIMELINE

### Week 2 (Jun 15-21): Stripe Setup & Staging

**By EOW:**
- [ ] Stripe account created & configured
- [ ] Products, prices, coupons set up in Stripe
- [ ] API keys in staging `.env`
- [ ] Webhook endpoint implemented & tested
- [ ] Test payment flow (signup → trial → charge)

### Week 3 (Jun 22-28): Production & Launch

**By Jun 28:**
- [ ] Stripe live account fully configured
- [ ] Live API keys in production secrets
- [ ] Pricing page live with checkout link
- [ ] First test transaction successful
- [ ] Finance reconciliation process tested

---

## 14. APPENDIX: HELPFUL LINKS

- **Stripe Docs:** https://stripe.com/docs
- **Stripe API Reference:** https://stripe.com/docs/api
- **Webhook Events:** https://stripe.com/docs/api/events
- **Test Card Numbers:** https://stripe.com/docs/testing#cards
- **3D Secure:** https://stripe.com/docs/payments/3d-secure
- **Subscription Billing:** https://stripe.com/docs/billing/subscriptions/overview

---

**Owner:** Backend Lead + Finance Lead  
**Status:** ✅ SPECIFICATION READY (awaiting engineering review)  
**Next Review:** Week 2 implementation kickoff  
**Last Updated:** June 12, 2026
