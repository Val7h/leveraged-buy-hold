# FINANCE WEEK 2 QUICK START GUIDE
## 5-Day Execution Plan (June 9-13, 2026)

**Your Role:** Finance Lead  
**This Week's Goal:** Get test payment working by Friday  
**Target Go-Live:** June 28, 2026 (2 weeks away)

---

## 🎯 YOUR MISSION THIS WEEK

By Friday EOD, you need:
1. ✅ Stripe account created & bank connected
2. ✅ API keys safely stored (never in Git)
3. ✅ 3 Stripe products configured
4. ✅ Test payment processes successfully ($0 trial)
5. ✅ Week 2 report written (go/no-go for June 28)

**Time Commitment:** ~8 hours over 5 days (spread it out)

---

## MONDAY MORNING (June 9) — 30 MINUTES

### Your First Task
1. Open https://stripe.com/register
2. Create account (use business email)
   - Name: LBH System Inc.
   - Industry: Financial Services
   - Product: Investment software

**What you'll get back:**
- Account credentials (save to 1Password NOW)
- Email confirmation
- Dashboard access

### Then Tell Your Team
Post in team Slack:
> "Starting Stripe setup. I'll have API keys by end of day."

---

## MONDAY AFTERNOON — 45 MINUTES

### Get Your API Keys
1. Login to Stripe Dashboard
2. Go to Developers → API Keys
3. **Copy these 3 values:**
   - Publishable key (starts with `pk_test_`)
   - Secret key (starts with `sk_test_`)
   - (Save webhook secret after Tuesday)

**IMPORTANT:** Copy them to 1Password vault immediately. Do NOT save in Slack or email.

### Tell Backend Lead
> "API keys ready. Check 1Password vault. Key names: STRIPE_PUBLISHABLE_KEY_TEST, STRIPE_SECRET_KEY_TEST"

---

## TUESDAY MORNING — 1 HOUR

### Connect Your Bank Account
1. Stripe Dashboard → Settings → Payout Settings
2. Click "Add Bank Account"
3. Enter bank details (US or Brazil based on your entity)
4. Verify (may take 1-2 business days)

**Payout Settings:**
- Frequency: Daily (important!)
- Minimum balance: $100 USD

---

## TUESDAY AFTERNOON — 1 HOUR

### Create 3 Products in Stripe
This is the fun part - it's like building your pricing tiers in Stripe.

**Product 1: Free**
- Name: `LBH System - Free`
- Type: Service
- Price: `$0.00/month` (one-time)
- Save this Price ID

**Product 2: Pro**
- Name: `LBH System - Pro`
- Type: Service
- Price: `$19.00/month`
- Billing: Monthly
- Trial: `14 days`
- Save this Price ID

**Product 3: Enterprise**
- Name: `LBH System - Enterprise`
- Type: Service
- Don't add price yet (custom per customer)
- Just create the product

**Then:**
1. Document all 3 Price IDs in 1Password
2. Share with Backend Lead: "Products created. Price IDs in vault."

---

## TUESDAY EVENING — 30 MINUTES

### Configure Webhook
1. Stripe Dashboard → Developers → Webhooks
2. Click "+ Add Endpoint"
3. Enter webhook URL:
   - Local: `http://localhost:8001/api/v1/webhooks/stripe`
   - Staging: `https://backend.staging.com/api/v1/webhooks/stripe`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Get the signing secret (starts with `whsec_test_`)
6. Save to 1Password

**Tell Backend Lead:**
> "Webhook configured. Signing secret in vault: STRIPE_WEBHOOK_SECRET_TEST"

---

## WEDNESDAY — OBSERVATION DAY (30 MINUTES)

Backend and Frontend teams are building. Your job:
- Monitor progress in daily standup
- Be available for questions
- Document any issues discovered

**What you're looking for:**
- Backend: "API tests passing"
- Frontend: "Pricing page deployed"
- QA: "End-to-end test scheduled"

---

## THURSDAY — OBSERVATION DAY (30 MINUTES)

Teams are testing the payment flow. You observe:
1. Does test card work (4242 x 12)?
2. Does subscription show in Stripe dashboard?
3. Does database record show subscription?
4. Any errors or blockers?

**Be ready to help with:**
- API key issues
- Stripe configuration questions
- Test data setup

---

## FRIDAY MORNING — 2 HOURS

### Create Unit Economics Spreadsheet
1. Make a copy of the template (UNIT_ECONOMICS_SPREADSHEET.md)
2. Create Google Sheets from template
3. Link to your Stripe account for live data
4. Set up weekly update schedule

**Key metrics to track:**
- CAC (Customer Acquisition Cost): $37.50
- LTV (Lifetime Value): $365
- Churn rate: Monitor weekly
- Conversion rate: 10% baseline

---

## FRIDAY AFTERNOON — 2 HOURS

### Write Week 2 Report
Template below. Just fill in the blanks:

```markdown
# FINANCE SPRINT 1 WEEK 2 — COMPLETION REPORT
Date: Friday June 13, 2026

## WHAT WE ACCOMPLISHED
- [x] Stripe account created & bank connected
- [x] 3 products configured (Free, Pro, Enterprise)
- [x] API keys safely stored
- [x] Test payment processed successfully
- [x] Pricing page deployed & tested
- [x] Unit economics spreadsheet linked

## WHAT WENT WELL
1. [Describe one success]
2. [Describe another]
3. [Describe third]

## WHAT WAS CHALLENGING
1. [Challenge 1 and how we solved it]
2. [Challenge 2 and how we solved it]

## METRICS WE MEASURED
- Test payment: ✅ $0 charge succeeded
- Trial setup: ✅ 14 days calculated correctly
- Database: ✅ Subscription record created
- Stripe: ✅ Subscription visible in dashboard

## GO/NO-GO FOR JUNE 28 LAUNCH
**Status:** 🟢 GO

**Why:**
- All technical infrastructure working
- Pricing copy finalized
- Unit economics validated
- Team confident in execution

**Conditions:**
- Legal CVM approval must finalize (already in progress)
- Feature paywalls must be implemented (Week 3)
- Production account must be set up (Week 3)

## CONFIDENCE LEVEL
🟢 HIGH

We're on track for June 28 launch. No critical blockers discovered.

## NEXT WEEK (Week 3)
- Production Stripe account setup
- Feature paywalls implemented
- Final security audit
- Go-live readiness check
```

---

## DAILY STANDUP SCRIPT (5 MINUTES)

Use this template for daily team sync:

```
FINANCE LEAD UPDATE:

YESTERDAY:
- [What you did]

TODAY:
- [What you're doing]

BLOCKERS:
- [Anything slowing you down?]

MORALE:
- 😊 Feeling good / Need support?
```

---

## CRITICAL CONTACTS

**Stripe Support:** support.stripe.com (always available)  
**Backend Lead:** [Contact info]  
**Frontend Lead:** [Contact info]  
**Product Lead:** [Contact info]  

---

## KEY DOCUMENTS TO REFERENCE

1. **STRIPE_SETUP_CHECKLIST_WEEK2.md** ← Step-by-step guide (bookmark this!)
2. **FINANCE_SPRINT1_WEEK2_EXECUTION.md** ← Detailed plan
3. **PRICING_PAGE_COPY_AND_FAQ.md** ← Approved copy
4. **UNIT_ECONOMICS_SPREADSHEET.md** ← Template to copy

---

## MONEY-SAVING TIP

Stripe costs are ZERO for trials (you pay 2.9% + $0.30 per charge only when real payments process). This week costs you nothing.

---

## SUCCESS LOOKS LIKE THIS

**By Friday Evening:**
- ✅ Your team says: "Payment flow works!"
- ✅ You see: Subscription in Stripe dashboard
- ✅ Database shows: subscription_tier = "pro", status = "trialing"
- ✅ Everyone feels: Confident about June 28 launch

---

## PROBLEMS & QUICK FIXES

**Problem:** "Stripe rejected my application"
**Quick Fix:** Usually just missing tax ID. Add it and reapply same day.

**Problem:** "API keys not working"
**Quick Fix:** Make sure you're using TEST keys (`pk_test_` / `sk_test_`), not LIVE.

**Problem:** "Webhook not triggering"
**Quick Fix:** Check endpoint URL spelling. Use Stripe dashboard "Send test event" button.

**Problem:** "Payment declined"
**Quick Fix:** Use correct test card: `4242 4242 4242 4242` (that's 4 groups of 4242).

---

## FRIDAY 5 PM CELEBRATION

If you hit all 5 checkboxes, you've earned it:
1. ✅ Stripe account
2. ✅ Products configured
3. ✅ Test payment working
4. ✅ Unit economics tracked
5. ✅ Week 2 report written

**You'll be 2 weeks away from launch. You've got this!**

---

## ONE MORE THING

Remember: **You are not alone this week.**
- Backend Lead is implementing the API
- Frontend Lead is building the pricing page
- QA is testing everything
- Product Lead is finalizing features

Your job is to be the quarterback. Make sure Stripe is set up so everyone else can do their job.

**You've got 5 days. You can do this. 🚀**

---

**Questions? Check STRIPE_SETUP_CHECKLIST_WEEK2.md or reach out to your team.**

**GO FINANCE LEAD! 💪**
