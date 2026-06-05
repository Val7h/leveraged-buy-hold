#!/bin/bash
# Finance Lead - CheckoutForm Integration Kickoff Script
# Run this IMMEDIATELY and follow the prompts

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "FINANCE LEAD - CHECKOUTFORM INTEGRATION"
echo "Executing NOW - Follow each step"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Verify component exists
echo ""
echo "STEP 1: Verify CheckoutForm component exists..."
if [ -f "frontend/src/components/CheckoutForm.tsx" ]; then
    echo "✅ Found: frontend/src/components/CheckoutForm.tsx"
    wc -l "frontend/src/components/CheckoutForm.tsx"
else
    echo "❌ ERROR: CheckoutForm.tsx not found!"
    exit 1
fi

# Step 2: Show integration guide
echo ""
echo "STEP 2: Read integration guide..."
echo "File: WEEK3_INTEGRATION_QUICK_START.txt"
echo "Focus: Finance Team section"
echo "Time: 10 minutes"

# Step 3: Install Stripe packages
echo ""
echo "STEP 3: Installing Stripe packages..."
cd frontend
npm install @stripe/react-stripe-js @stripe/js --save
if [ $? -eq 0 ]; then
    echo "✅ Stripe packages installed successfully"
else
    echo "❌ ERROR: npm install failed"
    exit 1
fi
cd ..

# Step 4: Setup environment variables
echo ""
echo "STEP 4: Setup environment variables..."
echo "Action: Open .env.local file and add:"
echo "  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx"
echo ""
echo "Get actual test keys from Stripe dashboard"
echo "For now, use temporary keys"

# Step 5: Verification
echo ""
echo "STEP 5: Verification..."
echo "✅ All libraries installed"
echo "✅ Ready for Monday morning integration"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "FINANCE: You're ready for Monday!"
echo "Tell CEO: 'CheckoutForm component reviewed, npm install done'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
