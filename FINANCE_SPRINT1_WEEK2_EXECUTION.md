# FINANCE SPRINT 1 WEEK 2 — EXECUTION PLAN
## Stripe Integration + Pricing Page Launch (June 9-15, 2026)

**Owner:** Finance Lead  
**Status:** IN PROGRESS  
**Target Go-Live:** June 28, 2026 (on schedule)  

---

## EXECUTIVE SUMMARY

Week 2 is the **execution phase** for Stripe integration and pricing page launch. This plan breaks down 5 work streams across 4 days to get a test payment successfully processed by Friday.

| Phase | Day | Owner | Deliverable | Status |
|-------|-----|-------|---|---|
| **Setup** | Mon-Tue | Finance + Backend | Stripe account + API keys + test mode | ⏳ TODO |
| **Config** | Tue-Wed | Backend + Product | Products in Stripe + feature segregation | ⏳ TODO |
| **Build** | Wed-Thu | Backend + Frontend | Payment flow + pricing page | ⏳ TODO |
| **Test** | Thu-Fri | QA + Finance | $1 test transaction successful | ⏳ TODO |
| **Report** | Fri | Finance | Week 2 completion + confidence assessment | ⏳ TODO |

---

## DAY 1-2: STRIPE ACCOUNT SETUP & API KEYS
**Owner:** Finance Lead + Backend Lead  
**Deadline:** Tuesday EOD  

### Task 1.1: Create Stripe Account (If Needed)
- [ ] Visit stripe.com/register
- [ ] Business email: [finance contact]
- [ ] Business name: LBH System Inc.
- [ ] Industry: Financial Services - Investment Software
- [ ] Website: https://lbhsystem.com
- [ ] **Deliverable:** Stripe account created + login credentials saved to secure vault

### Task 1.2: Complete Stripe Onboarding
- [ ] Connect bank account for payouts (Brazil or US entity?)
- [ ] Enter business address
- [ ] Enter tax ID (CNPJ/EIN depending on entity type)
- [ ] Enable 3D Secure
- [ ] Enable Radar fraud detection
- [ ] Set payout frequency: **Daily**
- [ ] Set minimum payout balance: $100 USD
- [ ] **Deliverable:** Stripe account fully activated (in Test mode)

### Task 1.3: Generate API Keys
**Test Mode (Staging):**
- [ ] Copy publishable key → save to `frontend/.env.local` as `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST`
- [ ] Copy secret key → save to `backend/.env` as `STRIPE_SECRET_KEY_TEST`
- [ ] Copy webhook signing secret → save as `STRIPE_WEBHOOK_SECRET_TEST`

**Production Mode (Save for Week 3):**
- [ ] Copy publishable key → save to secure vault
- [ ] Copy secret key → save to secure vault
- [ ] Copy webhook signing secret → save to secure vault
- [ ] **Note:** Don't use production keys until June 28 go-live

**Deliverable:** All keys stored + documented in team password manager

### Task 1.4: Configure Webhook Endpoint
- [ ] Staging webhook URL: `https://backend.staging.com/api/v1/webhooks/stripe`
- [ ] Test webhook URL: `http://localhost:8001/api/v1/webhooks/stripe`
- [ ] Subscribe to events:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.created`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `charge.refunded`
- [ ] **Deliverable:** Webhook configured + signing secret saved

---

## DAY 2-3: STRIPE PRODUCT CONFIGURATION
**Owner:** Backend Lead + Product Lead  
**Deadline:** Wednesday EOD  

### Task 2.1: Create Stripe Products (Test Mode)
**Product 1: Free Tier**
- [ ] Name: "LBH System - Free"
- [ ] Type: Service
- [ ] Price: $0/month (one-time)
- [ ] Save Price ID as `price_free_lbh_test`

**Product 2: Pro Monthly**
- [ ] Name: "LBH System - Pro"
- [ ] Type: Service
- [ ] Price: $19.00 USD/month
- [ ] Trial: 14 days
- [ ] Save Price ID as `price_pro_monthly_usd_test`
- [ ] Add metadata:
  ```json
  {
    "product_tier": "pro",
    "billing_period": "monthly",
    "trial_days": 14
  }
  ```

**Product 3: Enterprise (Custom)**
- [ ] Name: "LBH System - Enterprise"
- [ ] Type: Service
- [ ] Price: Custom (create per customer)
- [ ] Save as `price_enterprise_custom_test`
- [ ] Add metadata:
  ```json
  {
    "product_tier": "enterprise",
    "billing_period": "custom",
    "requires_sales": true
  }
  ```

**Deliverable:** 3 products created in Stripe test mode + Price IDs documented

### Task 2.2: Create Coupons (Optional for Week 2)
- [ ] Name: "EARLYBIRD20"
- [ ] Type: Percentage
- [ ] Discount: 20% off
- [ ] Duration: 3 months
- [ ] **Note:** Can skip for initial test; add in Week 3 if needed

**Deliverable:** Coupons ready (optional)

### Task 2.3: Feature Segregation Spec (Product)
**Product Lead to confirm:**
- [ ] Free tier features (5 assets, 1 backtest, 1 folder, community support)
- [ ] Pro tier features (unlimited screening, 10 backtests/month, 5 folders, email support, PDF export)
- [ ] Enterprise features (API access, white-label, dedicated manager, SLA 99.9%)
- [ ] How to gate features in code (subscription check)

**Deliverable:** Feature segregation spec document + code implementation plan

---

## DAY 3-4: PAYMENT FLOW IMPLEMENTATION
**Owner:** Backend Lead + Frontend Lead  
**Deadline:** Thursday EOD  

### Task 3.1: Backend Stripe Integration
**Python Requirements:**
```bash
pip install stripe
```

**Backend Tasks:**
- [ ] Create `backend/app/models/subscription.py` with Subscription model:
  ```python
  class Subscription(Base):
      __tablename__ = "subscriptions"
      id = Column(Integer, primary_key=True)
      user_id = Column(Integer, ForeignKey("users.id"))
      stripe_customer_id = Column(String, unique=True)
      stripe_subscription_id = Column(String, unique=True)
      tier = Column(String)  # free, pro, enterprise
      status = Column(String)  # active, trialing, past_due, canceled
      trial_ends_at = Column(DateTime)
      current_period_end = Column(DateTime)
      created_at = Column(DateTime, server_default=func.now())
  ```

- [ ] Create `backend/app/api/v1/billing.py` router with endpoints:
  ```
  POST   /api/v1/billing/create-subscription    (create Pro sub with trial)
  GET    /api/v1/billing/subscription           (get user's current sub)
  POST   /api/v1/billing/update-payment-method  (update card)
  POST   /api/v1/billing/cancel-subscription    (cancel Pro sub)
  GET    /api/v1/billing/invoice/{id}           (fetch invoice)
  ```

- [ ] Create `backend/app/api/v1/webhooks.py` router:
  ```
  POST   /api/v1/webhooks/stripe               (receive webhook events)
  ```

- [ ] Implement webhook handlers for:
  - `customer.subscription.created` → Update user tier to "pro"
  - `customer.subscription.updated` → Update status/period
  - `invoice.payment_succeeded` → Log successful charge
  - `invoice.payment_failed` → Trigger dunning email
  - `customer.subscription.deleted` → Downgrade user to "free"

**Deliverable:** Backend billing API + webhook handlers implemented + tested locally

### Task 3.2: Frontend Stripe Integration
**JavaScript Requirements:**
```bash
npm install @stripe/react-stripe-js @stripe/js
```

**Frontend Tasks:**
- [ ] Create `frontend/src/app/pricing/page.tsx` (pricing page component)
- [ ] Create `frontend/src/components/PricingCard.tsx` component
- [ ] Create `frontend/src/components/CheckoutForm.tsx` (Stripe payment form)
- [ ] Create `frontend/src/hooks/useStripe.ts` (custom hook for Stripe API calls)

**Pricing Page Layout:**
```
┌─────────────────────────────────────────────────┐
│  LBH System Pricing                             │
│  Choose the plan that fits your investing style │
├─────────────────────────────────────────────────┤
│
│  [FREE]              [PRO ★]           [ENTERPRISE]
│  $0/month           $19/month           $299+/month
│  ✓ 5 assets        ✓ Unlimited        ✓ Everything
│  ✓ 1 backtest      ✓ 10 backtests    ✓ API access
│  ✓ Community       ✓ Email support    ✓ Dedicated
│                    [Start 14-day ►]    [Contact ►]
│
└─────────────────────────────────────────────────┘
```

**Deliverable:** Pricing page live on staging + Stripe payment form integrated

### Task 3.3: Test Payment Flow (Staging)
- [ ] Navigate to pricing page
- [ ] Click "Start 14-day trial"
- [ ] Enter test card: `4242 4242 4242 4242`
- [ ] Enter any future expiry (e.g., 12/26)
- [ ] Enter any 3-digit CVC
- [ ] Submit form
- [ ] **Expected result:** Subscription created in Stripe; trial status shown
- [ ] Check database: User subscription record created
- [ ] Check Stripe dashboard: Subscription visible in Test mode

**Deliverable:** $0 test charge (trial) successful; user sees "Pro trial active until [Day 15]"

---

## DAY 4-5: VERIFICATION & REPORTING
**Owner:** Finance Lead + QA  
**Deadline:** Friday EOD  

### Task 4.1: Unit Economics Spreadsheet (Live Tracking)
- [ ] Create Google Sheets copy of template
- [ ] Link to Stripe API for live MRR tracking
- [ ] Set up weekly update schedule (every Monday)
- [ ] Document all assumptions (CAC, churn, conversion)

**Deliverable:** Google Sheets linked + weekly tracking process documented

### Task 4.2: Pricing Page Screenshots & Copy Verification
- [ ] Take screenshot of pricing page (desktop + mobile)
- [ ] Verify all 3 pricing cards visible
- [ ] Verify CTA buttons functional
- [ ] Verify FAQ section visible
- [ ] Verify copy matches approved version

**Deliverable:** Screenshots + copy verification checklist

### Task 4.3: Test Payment Confirmation
- [ ] Simulate first payment (Day 15 auto-charge) using Stripe test mode
- [ ] Verify invoice generated automatically
- [ ] Verify user notified of successful charge
- [ ] Verify subscription renewed for next 30-day cycle
- [ ] Verify failed payment flow (test with declined card)

**Deliverable:** Payment flow verified + dunning email template tested

### Task 4.4: Week 2 Completion Report
- [ ] Document: Stripe setup complete ✓
- [ ] Document: All API keys stored securely ✓
- [ ] Document: Products configured in test mode ✓
- [ ] Document: Pricing page live on staging ✓
- [ ] Document: Test payment successful ✓
- [ ] Document: Any blockers or risks discovered
- [ ] Document: Go/No-Go for production June 28

**Deliverable:** Week 2 completion report + confidence assessment

---

## CRITICAL DEPENDENCIES

| Task | Blocks | Owner | Due |
|------|--------|-------|-----|
| Stripe account created | API keys, products | Finance | Tue EOD |
| API keys configured | Backend dev | Backend | Tue EOD |
| Feature segregation spec | Frontend pricing page | Product | Wed EOD |
| Backend billing API | Frontend integration | Backend | Thu EOD |
| Pricing page component | Test payment | Frontend | Thu EOD |
| Test payment success | Week 2 sign-off | QA | Fri EOD |

---

## RISK MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|---|
| Stripe account rejected | Low | High | Have backup payment processor (Paddle, Lemonsqueezy) ready |
| API key leakage | Low | Critical | Store in secure vault; never commit to Git |
| Payment form integration bugs | Medium | High | Test with 10+ test card scenarios |
| Webhook signature verification fails | Medium | Medium | Use Stripe's official libraries; verify examples |
| Trial not triggering on Day 15 | Low | High | Set up automated test for Day 15 charge |
| Feature gating not working | Medium | Medium | Unit test paywall logic before production |

---

## SUCCESS CRITERIA (END OF WEEK 2)

✅ **Technical:**
- Stripe account created + API keys configured
- 3 products created in test mode (Free, Pro, Enterprise)
- Backend billing API fully implemented + tested
- Pricing page live on staging with working payment form
- Test payment processed successfully ($0 trial charge)
- Webhook integration verified (at least 2 event types tested)
- Unit economics spreadsheet linked + auto-updating

✅ **Business:**
- Pricing copy finalized + matches approved version
- FAQ section complete + accessible on pricing page
- Feature segregation locked + developers can implement paywalls
- All 3 pricing cards visible + CTAs functional
- First test charge on Day 15 simulated successfully

✅ **Confidence:**
- Finance Lead confident in go-live June 28? YES/NO
- Any blockers discovered? List them
- Production timeline realistic? YES/NO

---

## NEXT STEPS (Week 3: June 16-22)

- [ ] Stripe production account setup (use live API keys)
- [ ] Migrate test data to production
- [ ] Feature paywalls implemented in app
- [ ] Pricing page published to production
- [ ] First real transaction (June 28 launch)
- [ ] First cohort analysis (first 15 days of data)

---

## DELIVERABLES BY FRIDAY

**1. Stripe Setup Status**
- Account created & verified
- API keys documented
- Webhook endpoint configured
- No blockers identified

**2. Pricing Page Screenshots**
- Desktop screenshot (all 3 cards visible)
- Mobile screenshot (responsive design)
- Copy verification checklist

**3. Unit Economics Spreadsheet**
- Google Sheets created
- Weekly tracking process defined
- Key metrics: CAC, LTV, churn, conversion

**4. Test Payment Confirmation**
- $0 trial charge successful
- Invoice generated automatically
- User tier upgraded to "Pro"
- Email notification sent

**5. Week 2 Report**
- All tasks completed? YES/NO
- Any blockers? (list)
- Go/No-Go for June 28 launch? YES/NO
- Confidence level: HIGH / MEDIUM / LOW

---

**Finance Lead Sign-Off:** ________________  
**Backend Lead Sign-Off:** ________________  
**Product Lead Sign-Off:** ________________  

**Target Completion:** Friday, June 15, 2026, 5 PM

---

**END OF WEEK 2 EXECUTION PLAN**
