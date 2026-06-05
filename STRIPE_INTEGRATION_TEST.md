# Stripe Integration Testing Guide

## Status
- ✅ CheckoutForm component created (ready)
- ✅ Integrated into pricing page (ready)
- ✅ .env files configured (ready)
- ⏳ npm packages (to be installed Monday morning)

## Monday Morning Testing Steps

### Step 1: Install Stripe Packages (5-10 minutes)
```bash
cd frontend
npm install @stripe/react-stripe-js @stripe/js --save
```

Expected output:
```
added 2 packages
```

### Step 2: Get Stripe Test Keys (5 minutes)

Go to: https://dashboard.stripe.com

1. Login to your Stripe account
2. Go to: Developers > API Keys
3. Copy your "Publishable Key" (starts with `pk_test_`)
4. Copy your "Secret Key" (starts with `sk_test_`)

### Step 3: Update .env.local (2 minutes)

```bash
# frontend/.env.local
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Step 4: Start Dev Server (5 minutes)

```bash
npm run dev
```

Open: http://localhost:3000

### Step 5: Test Pricing Page (5 minutes)

1. Click "Pricing" in navigation
2. Find the Pro card
3. Click "Start 14-day Trial" button
4. Verify: Checkout modal appears
5. Verify: No console errors (F12 to open DevTools)

### Step 6: Test Checkout Form (10 minutes)

In the modal that appeared:

1. Fill card info (use test card):
   - Card number: 4242 4242 4242 4242
   - Expiry: 12/25 (any future date)
   - CVC: 123 (any 3 digits)

2. Click "Subscribe to Pro" button

3. Watch Network tab (DevTools > Network):
   - Should see POST to `/api/v1/billing/create-subscription`
   - Should get 200 response

4. Verify: Success message or error message appears

### Step 7: Mobile Responsive Test (10 minutes)

Chrome DevTools:
1. Press F12 (open DevTools)
2. Press Ctrl+Shift+M (toggle device toolbar)
3. Select "iPhone 12" from device dropdown
4. Test on the mobile view:
   - Modal still appears
   - Form fields are visible
   - Button is clickable
   - No horizontal scrolling

5. Try "iPad" too
6. Try "Samsung Galaxy" (Android)

### Step 8: Error Handling Test (5 minutes)

Test invalid card:
1. Click "Start 14-day Trial" again
2. Use card: 4000 0000 0000 0002 (decline card)
3. Verify: Error message appears
4. Verify: User can retry

## Expected Behavior

### Success Flow
1. User sees pricing page
2. Clicks "Start 14-day Trial"
3. Modal pops up with card form
4. User fills card details (or uses test card)
5. User clicks "Subscribe to Pro"
6. Backend processes (charges on Day 15, $19/month after trial)
7. User sees confirmation
8. User can access Pro features

### Error Flow
1. If card declines → Show error message
2. If network error → Show error message
3. User can click button again to retry

### Mobile Flow
1. Modal responsive on all sizes
2. Form fields touch-friendly (44px+ buttons)
3. No horizontal scrolling
4. All text readable (16px+ font)

## Stripe Test Cards

| Card Number | Description |
|---|---|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Decline |
| 4000 0025 0000 3155 | 3D Secure (requires auth) |
| 5555 5555 5555 4444 | Mastercard success |

## Backend Endpoint

Your backend should have:

```
POST /api/v1/billing/create-subscription
```

Accepts:
```json
{
  "plan": "pro",
  "trial_days": 14,
  "stripe_token": "tok_xxx"
}
```

Returns:
```json
{
  "success": true,
  "subscription_id": "sub_xxx",
  "message": "Subscription created"
}
```

## Troubleshooting

### "Stripe is not defined"
→ Packages not installed yet
→ Run: `npm install @stripe/react-stripe-js @stripe/js`

### "404 on /api/v1/billing/create-subscription"
→ Backend endpoint not created
→ Create it in your backend with proper Stripe SDK integration

### "Failed to load Stripe.js"
→ Check NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in .env.local
→ Make sure key is correct format (pk_test_xxxxx)

### Modal doesn't appear
→ Check that CheckoutForm was integrated into pricing page
→ Open DevTools Console and look for errors

### Mobile layout broken
→ Check responsive classes in CheckoutForm
→ Verify viewport meta tag in head

## Success Criteria

✅ npm install succeeds
✅ Dev server starts without errors
✅ Pricing page loads
✅ Modal appears on button click
✅ No console errors
✅ Test card succeeds
✅ Error card shows error message
✅ Mobile responsive works
✅ Backend receives POST request
✅ User can complete checkout

## Timeline

Total time: ~1 hour (realistic)
- Install: 5-10 min
- Config: 5 min
- Dev server: 5 min
- Testing: 35-40 min

This puts Finance integration at 100% ✅
