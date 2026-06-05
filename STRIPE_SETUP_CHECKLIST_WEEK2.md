# STRIPE SETUP CHECKLIST — WEEK 2 IMPLEMENTATION
## Step-by-Step Configuration for LBH System

**Owner:** Finance Lead + Backend Lead  
**Status:** READY FOR IMPLEMENTATION  
**Deadline:** Friday June 15, 2026, 5 PM  

---

## PHASE 1: STRIPE ACCOUNT & API KEYS (Mon-Tue)

### Step 1.1: Create Stripe Account
If you don't have a Stripe account:
- [ ] Go to https://stripe.com/register
- [ ] Enter business email (e.g., finance@lbhsystem.com)
- [ ] Enter business name: **LBH System Inc.**
- [ ] Create password
- [ ] Verify email address
- [ ] Complete onboarding flow

### Step 1.2: Connect Bank Account for Payouts
- [ ] Go to Stripe Dashboard → Settings → Payout Settings
- [ ] Add bank account (US or Brazil based on entity)
  - **For Brazil:** Nubank, Itaú, or other major bank
  - **For US:** Chase, Wells Fargo, or other US bank
- [ ] Verify bank details
- [ ] Set payout frequency: **Daily**
- [ ] Set minimum payout balance: **$100 USD**

### Step 1.3: Get API Keys (Test Mode)
- [ ] Go to Stripe Dashboard → Developers → API Keys
- [ ] **Copy test publishable key** (starts with `pk_test_`)
  - Save to `frontend/.env.local`:
    ```
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_xxxxx...
    ```

- [ ] **Copy test secret key** (starts with `sk_test_`)
  - Save to `backend/.env`:
    ```
    STRIPE_SECRET_KEY_TEST=sk_test_xxxxx...
    ```

### Step 1.4: Get Webhook Signing Secret
- [ ] Go to Stripe Dashboard → Developers → Webhooks
- [ ] Click **Add Endpoint**
- [ ] Enter endpoint URL:
  - Staging: `https://backend.staging.com/api/v1/webhooks/stripe`
  - Local: `http://localhost:8001/api/v1/webhooks/stripe`
- [ ] Select events to subscribe to:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.created`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `charge.refunded`
- [ ] **Copy signing secret** (starts with `whsec_test_`)
  - Save to `backend/.env`:
    ```
    STRIPE_WEBHOOK_SECRET_TEST=whsec_test_xxxxx...
    ```

### Step 1.5: Enable Required Features
- [ ] Go to Stripe Dashboard → Settings → Features
- [ ] Enable:
  - [ ] Subscriptions (recurring billing)
  - [ ] Payment intents
  - [ ] 3D Secure
  - [ ] Radar (fraud detection)
  - [ ] Billing (invoicing)

---

## PHASE 2: STRIPE PRODUCT CONFIGURATION (Tue-Wed)

### Step 2.1: Create Free Product
- [ ] Go to Stripe Dashboard → Products
- [ ] Click **+ Add Product**
  - Name: `LBH System - Free`
  - Type: Service
  - Click **Create product**
- [ ] Under **Pricing** section, click **Add a price**
  - Amount: `0.00` USD
  - Billing period: **One time**
  - Save price ID: **Copy & paste this somewhere safe**
    ```
    price_free_lbh_test = <paste here>
    ```

### Step 2.2: Create Pro Monthly Product
- [ ] Click **+ Add Product**
  - Name: `LBH System - Pro`
  - Type: Service
  - Click **Create product**
- [ ] Under **Pricing**, click **Add a price**
  - Amount: `19.00` USD
  - Currency: USD
  - Billing period: **Monthly**
  - Trial period days: `14`
  - Add metadata:
    ```json
    {
      "product_tier": "pro",
      "billing_period": "monthly"
    }
    ```
  - Click **Save price**
  - Save price ID:
    ```
    price_pro_monthly_usd_test = <paste here>
    ```

### Step 2.3: Create Enterprise Product (Optional for now)
- [ ] Click **+ Add Product**
  - Name: `LBH System - Enterprise`
  - Type: Service
  - Description: "Custom pricing for advisors and RIAs"
  - Click **Create product**
- [ ] DON'T add a price yet (enterprise pricing is custom per customer)
- [ ] Save product ID for later

### Step 2.4: Document All Price IDs
Create a file called `.stripe-test-prices.env` with all your test mode price IDs:

```env
# Test Mode Price IDs (from Stripe Dashboard)
STRIPE_PRICE_FREE=price_free_lbh_test
STRIPE_PRICE_PRO_MONTHLY=price_pro_monthly_usd_test
STRIPE_PRICE_PRO_ANNUAL=price_pro_annual_usd_test  # Q3 2026
STRIPE_PRICE_ENTERPRISE=price_enterprise_custom_test

# Test Mode Keys
STRIPE_PUBLISHABLE_KEY_TEST=pk_test_xxxxx...
STRIPE_SECRET_KEY_TEST=sk_test_xxxxx...
STRIPE_WEBHOOK_SECRET_TEST=whsec_test_xxxxx...
```

Save this in a password manager (1Password, Vault, etc.) - don't commit to Git.

---

## PHASE 3: BACKEND SETUP (Tue-Wed)

### Step 3.1: Install Stripe Python Package
```bash
cd backend
pip install stripe
```

### Step 3.2: Update Environment Variables
Add to `backend/.env`:
```env
# Stripe Test Mode (Week 2)
STRIPE_SECRET_KEY_TEST=sk_test_xxxxx...
STRIPE_WEBHOOK_SECRET_TEST=whsec_test_xxxxx...

# Stripe Price IDs (from Stripe Dashboard)
STRIPE_PRICE_FREE=price_free_lbh_test
STRIPE_PRICE_PRO_MONTHLY=price_pro_monthly_usd_test
STRIPE_PRICE_ENTERPRISE=price_enterprise_custom_test
```

### Step 3.3: Verify Database Migration
The new `Subscription` model needs a database table. Run:
```bash
# This should already happen on app startup, but verify:
cd backend
python -c "from app.core.database import create_tables; create_tables()"
```

Check PostgreSQL to confirm `subscriptions` table was created:
```bash
psql -d lbh_system -c "\dt subscriptions"
```

### Step 3.4: Test Backend Endpoints Locally
```bash
cd backend
uvicorn app.main:app --reload
```

Then test endpoints:

**1. Create Pro Subscription (with trial)**
```bash
curl -X POST http://localhost:8001/api/v1/billing/create-subscription \
  -H "Authorization: Bearer <your_test_token>" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "status": "success",
  "subscription_id": "sub_test_xxxxx",
  "tier": "pro",
  "trial_ends_at": "2026-06-20T12:00:00",
  "message": "Pro trial active! Your card will be charged $19.00 on June 20, 2026"
}
```

**2. Get Current Subscription**
```bash
curl -X GET http://localhost:8001/api/v1/billing/subscription \
  -H "Authorization: Bearer <your_test_token>"
```

**3. Check Feature Access**
```bash
curl -X GET "http://localhost:8001/api/v1/billing/feature-access?feature=unlimited_screening" \
  -H "Authorization: Bearer <your_test_token>"
```

---

## PHASE 4: FRONTEND SETUP (Wed-Thu)

### Step 4.1: Install Stripe React Library
```bash
cd frontend
npm install @stripe/react-stripe-js @stripe/js
```

### Step 4.2: Update Frontend Environment Variables
Add to `frontend/.env.local`:
```env
# Stripe Test Mode
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_xxxxx...
NEXT_PUBLIC_API_URL=http://localhost:8001
```

### Step 4.3: Add Stripe Provider to Layout
Edit `frontend/src/app/layout.tsx`:

```typescript
'use client';

import { ReactNode } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST || ''
);

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body>
        <Elements stripe={stripePromise}>
          {children}
        </Elements>
      </body>
    </html>
  );
}
```

### Step 4.4: Test Pricing Page
```bash
cd frontend
npm run dev
```

Navigate to: `http://localhost:3000/pricing`

Verify:
- [ ] 3 pricing cards visible (Free, Pro, Enterprise)
- [ ] Correct prices displayed ($0, $19, $299)
- [ ] CTA buttons visible
- [ ] FAQ section accessible
- [ ] Mobile responsive (test on phone or DevTools)

---

## PHASE 5: PAYMENT FLOW TESTING (Thu)

### Step 5.1: Test Stripe Test Cards
Use these test cards in Stripe test mode:

| Card Number | Exp | CVC | Result |
|---|---|---|---|
| 4242 4242 4242 4242 | Any future | Any 3 digits | **SUCCESS** - Use this |
| 4000 0000 0000 9995 | Any future | Any 3 digits | Decline - Tests error flow |
| 4000 0027 6000 3184 | Any future | Any 3 digits | Requires 3D Secure |

### Step 5.2: Complete End-to-End Test
1. **Login to app**
   - Navigate to `http://localhost:3000/login`
   - Log in with test account

2. **Visit Pricing Page**
   - Navigate to `http://localhost:3000/pricing`
   - Click **"Start 14-day Trial"** button
   - You should be redirected to login if not authenticated

3. **Fill Checkout Form**
   - Card: `4242 4242 4242 4242`
   - Expiry: `12/26`
   - CVC: `123`
   - Email: (auto-filled from account)
   - Check terms checkbox
   - Click **"Start Free 14-Day Trial"**

4. **Verify Success**
   - [ ] See success message
   - [ ] Redirected to dashboard
   - [ ] Dashboard shows "Pro Trial Active"
   - [ ] Shows "Charges on [Date]"

5. **Verify Database**
   ```bash
   psql -d lbh_system -c "SELECT * FROM subscriptions WHERE user_id = <your_user_id>;"
   ```
   
   Should show:
   - `tier` = "pro"
   - `status` = "trialing"
   - `is_trial_active` = true
   - `trial_ends_at` = 14 days from now

6. **Verify Stripe Dashboard**
   - Go to Stripe Dashboard → Customers
   - Find customer with your email
   - Click to view subscription
   - Should show:
     - Status: "Trialing"
     - Trial ends: 14 days from signup
     - Next scheduled charge: $19.00

### Step 5.3: Test Failed Payment Flow (Optional but recommended)
1. Repeat test above with card `4000 0000 0000 9995` (decline card)
2. Should see error message: "Your card was declined"
3. Can retry with valid card

### Step 5.4: Test Webhook Integration
1. Go to Stripe Dashboard → Developers → Webhooks
2. Find your endpoint, click **Send test event**
3. Select `customer.subscription.created`
4. Click **Send test event**
5. Check your backend logs for webhook handler execution
6. Verify database was updated

---

## PHASE 6: VERIFICATION & SIGN-OFF (Fri)

### Step 6.1: Stripe Account Checklist
- [ ] Account created & verified
- [ ] Bank account connected
- [ ] Payout settings configured (daily)
- [ ] 3D Secure enabled
- [ ] Radar fraud detection enabled
- [ ] Webhooks configured & tested

### Step 6.2: Products & Pricing Checklist
- [ ] Free product created (price = $0)
- [ ] Pro product created (price = $19/mo, 14-day trial)
- [ ] Enterprise product created (custom pricing)
- [ ] All price IDs documented in secure vault
- [ ] Metadata tags added to each product

### Step 6.3: Backend Integration Checklist
- [ ] Stripe library installed
- [ ] API keys in `.env` (never in Git)
- [ ] Subscription model created
- [ ] Billing router implemented & tested
- [ ] Webhook endpoints functional
- [ ] Feature gating working (`/api/v1/billing/feature-access`)

### Step 6.4: Frontend Integration Checklist
- [ ] Stripe React library installed
- [ ] Pricing page created & visible
- [ ] Checkout form implemented
- [ ] Trial logic correct (Day 15 charge)
- [ ] Success/error messaging working
- [ ] Mobile responsive

### Step 6.5: Payment Flow Testing Checklist
- [ ] Test card works (4242 x 12)
- [ ] Subscription created in database
- [ ] Subscription created in Stripe
- [ ] Trial status shows on dashboard
- [ ] 14-day countdown visible
- [ ] Webhook events triggering

### Step 6.6: Documentation Checklist
- [ ] All API keys documented (secure vault)
- [ ] Environment variables documented
- [ ] Test card numbers documented
- [ ] Webhook events documented
- [ ] Feature access matrix documented
- [ ] Setup instructions written for team

---

## TROUBLESHOOTING

### Problem: "Invalid API Key"
**Solution:** Make sure you're using TEST mode keys (`pk_test_`, `sk_test_`), not live keys.

### Problem: "Webhook signature verification failed"
**Solution:** 
1. Verify webhook signing secret is exactly correct
2. Make sure request body is raw bytes (not parsed JSON)
3. Check timestamp isn't too old (Stripe rejects >5 min old)

### Problem: "No subscription found for user"
**Solution:**
1. Verify user is authenticated (has valid JWT)
2. Check database for subscription record
3. Try creating subscription again

### Problem: "Card declined" even with test card
**Solution:**
1. Make sure you're in TEST mode, not LIVE
2. Use correct test card: `4242 4242 4242 4242`
3. Check card expiry is in future

### Problem: "Pricing page not loading"
**Solution:**
1. Verify Stripe publishable key is in `.env.local`
2. Verify `<Elements>` provider wraps the app
3. Check browser console for errors
4. Verify Stripe library installed (`npm list @stripe/react-stripe-js`)

---

## SECURITY CHECKLIST

- [ ] Secret keys NEVER in Git
- [ ] Environment variables use `.env` or `.env.local`
- [ ] Webhook signing secret verified before processing
- [ ] API calls use HTTPS (in production)
- [ ] Card data NEVER sent to backend (handled by Stripe)
- [ ] PCI compliance: Use official Stripe libraries, not custom code

---

## NEXT STEPS (Week 3)

- [ ] Migrate from TEST to LIVE API keys (June 16)
- [ ] Configure production Stripe account
- [ ] Test with real credit cards (in production)
- [ ] Feature paywalls implemented (Pro-only features)
- [ ] Pricing page published to production
- [ ] Go-live: June 28, 2026

---

## SIGN-OFF

When all checkboxes are complete, Finance Lead and Backend Lead sign off:

**Finance Lead:** ________________ Date: ________

**Backend Lead:** ________________ Date: ________

**Frontend Lead:** ________________ Date: ________

**Status:** ✓ Ready for production migration

---

**END OF STRIPE SETUP CHECKLIST**
