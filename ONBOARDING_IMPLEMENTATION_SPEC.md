# ONBOARDING IMPLEMENTATION SPECIFICATION
## LBH System Frontend Integration Guide

**Date:** June 9, 2026  
**Owner:** Product Lead + Frontend Lead  
**Status:** 🟡 IN PROGRESS  
**Timeline:** Completion by June 17, 2026  
**Estimated Effort:** 16 hours (frontend engineering)

---

## EXECUTIVE SUMMARY

This spec transforms Week 1's "onboarding strategy" into concrete frontend requirements. It specifies:

1. **Tutorial UI** - 5-step interactive flow with progress tracking
2. **Risk Disclaimer Modal** - Legal compliance gate
3. **Email Integration** - Backend event triggers
4. **Mobile Responsiveness** - Lighthouse score targets
5. **Testing & Launch Checklist** - QA acceptance criteria

**Success Criteria:**
- ✅ Tutorial 70%+ completion rate by Day 7
- ✅ Mobile Lighthouse score >75
- ✅ Page load time <3 seconds
- ✅ Zero critical UX bugs in QA testing

---

## SECTION 1: CURRENT STATE ANALYSIS

### 1.1 Frontend Technology Stack

**Assumed Stack** (confirm with Frontend Lead):
- Framework: Next.js 14 (App Router)
- UI Library: React 18 + Tailwind CSS
- State Management: Redux or Context API
- Form Handling: React Hook Form
- API Client: Axios or Fetch API
- Email Service: Postmark or SendGrid
- Analytics: Mixpanel or Amplitude SDK

**Check with Frontend Lead:**
```
[ ] What's the current tech stack?
[ ] What UI component library are we using?
[ ] How are we handling state management?
[ ] Is there a design system already?
[ ] What's the routing structure?
[ ] Bundle size constraints?
```

### 1.2 Existing Pages & Components

**Likely existing pages:**
- `/` - Landing page
- `/auth/signup` - Registration
- `/auth/login` - Login
- `/auth/verify-email` - Email verification
- `/dashboard` - Main app (post-login)
- `/settings` - User settings
- `/pricing` - Pricing page

**Components likely needed:**
- Modal/Dialog (risk disclaimer)
- Stepper/Progress Bar (tutorial steps)
- Form inputs (user data collection)
- Button (CTAs, navigation)
- Loading spinner
- Error boundary (error states)
- Card (step content)
- Badge/Badge status indicator

### 1.3 Key Integration Points

```
LOGIN FLOW:
┌─────────────────────────────────────┐
│ User logs in successfully            │
│ (JWT token stored)                   │
└──────────────┬──────────────────────┘
               │
               ├─→ Check: Has user seen disclaimer?
               │   NO: Show Risk Disclaimer Modal
               │   YES: Proceed to next check
               │
               ├─→ Check: Has user completed tutorial?
               │   NO: Show Tutorial Step 1
               │   YES: Go to Dashboard
               │
               └─→ Redirect to Dashboard
                   (if both completed)

TUTORIAL FLOW:
Step 1 (Screening) → Step 2 (Backtest) → Step 3 (Risk) → Step 4 (Alerts) → Step 5 (Success)
               ↓              ↓               ↓             ↓              ↓
          [Skip available]  [Skip...]   [Skip...]   [Complete]      [Dashboard]
```

---

## SECTION 2: RISK DISCLAIMER MODAL

### 2.1 Specification

**When to Show:**
- Triggers: On first login after email verification
- Condition: `user.has_seen_disclaimer === false`
- Placement: Modal overlay, center screen, z-index 1000
- Dismissible: NO (must accept or decline to proceed)

**Modal Structure:**

```jsx
<Modal
  title="⚠️  IMPORTANT: RISK DISCLOSURE"
  subtitle="Please read carefully before using LBH System"
  width="600px"
  closeButton={false}  // No X button
>
  <ModalBody>
    <RiskDisclaimer text={LEGAL_DISCLAIMER_TEXT} />
  </ModalBody>
  
  <ModalFooter>
    <Checkbox
      id="accept-checkbox"
      label="I understand the risks and accept the terms"
      required={true}
    />
    <Button 
      variant="primary"
      onClick={handleAccept}
      disabled={!checkboxChecked}
    >
      ACCEPT & CONTINUE
    </Button>
    <Button 
      variant="secondary"
      onClick={handleDecline}
    >
      DECLINE & EXIT
    </Button>
  </ModalFooter>
</Modal>
```

### 2.2 Legal Text (From Legal Team)

```
RISK DISCLOSURE - LBH SYSTEM

⚠️  CRITICAL DISCLAIMER

LBH System uses leverage (borrowed money) to amplify investment returns.
LEVERAGE AMPLIFIES BOTH GAINS AND LOSSES.

BEFORE YOU CONTINUE, you must understand:

1. LOSS OF PRINCIPAL
   You may lose MORE than your initial investment. If the market moves
   against your position, you could lose 100%+ of your capital.

2. MARGIN CALLS
   If your account value drops below required margin levels, your broker
   can force you to close positions at unfavorable prices.

3. LEVERAGE RISK
   - 2x leverage = losses magnified 2x
   - 3x leverage = losses magnified 3x
   - During market crashes (e.g., 2008), leverage accelerates losses

4. NOT SUITABLE FOR EVERYONE
   Leverage investing is ONLY for:
   - Sophisticated investors (understand margin mechanics)
   - Risk-tolerant investors (can handle 30-50% drawdowns)
   - Long-term investors (can weather short-term volatility)
   - Investors with adequate capital reserves

5. NO GUARANTEES
   Past performance does not guarantee future results. Our algorithm
   is based on historical backtesting and may not work in future market
   conditions.

6. CURRENCY RISK (Brazil)
   If trading in currencies other than BRL, you face additional
   foreign exchange (FX) risk.

7. REGULATORY RISK
   Leverage trading may be restricted in your jurisdiction. Consult
   legal counsel before using LBH System.

BY CLICKING "ACCEPT", YOU:
✓ Acknowledge you understand leverage and margin call risks
✓ Confirm you are 18+ years old and legally able to trade
✓ Accept that you may lose money
✓ Release LBH System from liability for losses

LBH System is NOT:
✗ Financial advice (consult a financial advisor)
✗ A broker (we're a software tool)
✗ Guaranteed to make money
✗ Suitable for short-term trading

FOR MORE INFORMATION:
- See our full Terms of Service: [LINK]
- See our Privacy Policy: [LINK]
- See our Risk Management Guide: [LINK]
- Contact support: support@lbhsystem.com
```

### 2.3 Backend Requirements

**Event to Fire:**
```javascript
{
  event: "risk_disclaimer_shown",
  properties: {
    user_id: "xxx",
    timestamp: "2026-06-09T14:30:00Z",
    session_id: "xxx"
  }
}
```

**API Endpoint Needed (Backend):**
```
POST /api/user/accept-disclaimer
Body: {
  "accepted": true/false
}
Response: {
  "success": true,
  "user": { ...updated user object }
}

Backend action:
- Set user.has_seen_disclaimer = true
- Set user.disclaimer_accepted_at = now
- Store IP address for compliance audit
- Log event to analytics
```

### 2.4 Mobile Design

**Mobile constraints:**
- Modal takes 90% width (max 480px) on mobile
- Text large enough to read (16px minimum)
- Checkbox easy to tap (touch-friendly)
- Buttons large (44px min height per WCAG)
- Scrollable content (allow scrolling inside modal if needed)

---

## SECTION 3: TUTORIAL (5-STEP FLOW)

### 3.1 Overall Tutorial Structure

**Route:** `/onboarding/tutorial`  
**Component Hierarchy:**
```
<TutorialPage>
  <TutorialContainer>
    <ProgressBar currentStep={step} totalSteps={5} />
    <TutorialContent>
      {step === 1 && <ScreeningStep />}
      {step === 2 && <BacktestStep />}
      {step === 3 && <RiskProfileStep />}
      {step === 4 && <AlertsStep />}
      {step === 5 && <SuccessStep />}
    </TutorialContent>
    <TutorialNavigation>
      <Button onClick={() => goToPreviousStep()} disabled={step === 1}>
        ← BACK
      </Button>
      <Button onClick={() => skipTutorial()}>
        SKIP
      </Button>
      <Button 
        onClick={() => goToNextStep()}
        disabled={!canProceedToNextStep()}
      >
        NEXT →
      </Button>
    </TutorialNavigation>
  </TutorialContainer>
</TutorialPage>
```

### 3.2 Step 1: Screening

**URL:** `/onboarding/tutorial/step/1`  
**Duration:** 60 seconds  
**Learning Goal:** "Understand how LBH finds buying opportunities"

**UI Layout:**
```
┌──────────────────────────────────────────┐
│ LBH System Onboarding      [████░░░░░░] 20%│
├──────────────────────────────────────────┤
│                                          │
│  STEP 1: Screening                       │
│  ════════════════════════════════════    │
│                                          │
│  What: LBH analyzes 500 stocks using     │
│        RSI + Composite Scoring           │
│                                          │
│  Goal: Find assets ready to buy         │
│        (when RSI < 30 = oversold)       │
│                                          │
│  Your task: Screen these 5 assets       │
│                                          │
│  ┌─ ASSET RESULTS ────────────────────┐ │
│  │ Asset        RSI   Score  Action   │ │
│  ├─────────────────────────────────────┤ │
│  │ VTSAX (VTI)   28   4.3/5  ⭐⭐⭐   │ │
│  │ [+ ADD TO FAVORITES]                │ │
│  │                                     │ │
│  │ AAPL          35   3.8/5  ⭐⭐     │ │
│  │ [+ ADD TO FAVORITES]                │ │
│  │                                     │ │
│  │ JNJ           32   3.9/5  ⭐⭐     │ │
│  │ [+ ADD TO FAVORITES]                │ │
│  │                                     │ │
│  │ SPY           40   3.2/5  ⭐       │ │
│  │ [+ ADD TO FAVORITES]                │ │
│  │                                     │ │
│  │ NFLX          50   2.1/5  –         │ │
│  │ [+ ADD TO FAVORITES]                │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  📺 WATCH 30-SEC VIDEO (optional)       │
│                                          │
│ [← BACK]  [SKIP THIS STEP]  [NEXT →]   │
└──────────────────────────────────────────┘
```

**Component Code (Pseudo):**
```jsx
function ScreeningStep() {
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [assets, setAssets] = useState(SAMPLE_ASSETS); // 5 test assets
  
  return (
    <div className="screening-step">
      <h2>STEP 1: Screening</h2>
      <p>What: LBH analyzes stocks using RSI + Scoring</p>
      <p>Goal: Find assets ready to buy (RSI &lt; 30)</p>
      
      <AssetTable>
        {assets.map(asset => (
          <AssetRow key={asset.id} asset={asset}>
            <Button 
              onClick={() => selectAsset(asset.id)}
              variant={selectedAssets.includes(asset.id) ? "primary" : "secondary"}
            >
              {selectedAssets.includes(asset.id) ? "✓ ADDED" : "+ ADD"}
            </Button>
          </AssetRow>
        ))}
      </AssetTable>
      
      <VideoTrigger>
        📺 WATCH 30-SEC VIDEO (optional)
      </VideoTrigger>
    </div>
  );
}
```

**Event Fired:**
```javascript
{
  event: "tutorial_step_1_completed",
  properties: {
    user_id: "xxx",
    assets_added: 2,
    video_watched: false,
    time_to_complete: 45,  // seconds
    timestamp: "2026-06-09T14:35:00Z"
  }
}
```

**Acceptance Criteria:**
- [ ] At least 1 asset added to favorites (or skipped)
- [ ] Page loads in <2 seconds
- [ ] Mobile responsive (test on iPhone 12)
- [ ] Video plays smoothly (optional, not blocking)

---

### 3.3 Step 2: Backtest

**URL:** `/onboarding/tutorial/step/2`  
**Duration:** 60 seconds  
**Learning Goal:** "See historical proof that LBH works"

**UI Layout:**
```
┌──────────────────────────────────────────┐
│ LBH System Onboarding      [████████░░] 40%│
├──────────────────────────────────────────┤
│                                          │
│  STEP 2: Backtest                        │
│  ════════════════════════════════════    │
│                                          │
│  What: Let's test your strategy on       │
│        20 years of historical data       │
│                                          │
│  Your strategy vs. S&P 500               │
│                                          │
│  ┌─ EQUITY CURVE ─────────────────────┐ │
│  │                                    │ │
│  │     Your Strategy (LBH) ↗↗↗        │ │
│  │     S&P 500 (Buy & Hold) ↗          │ │
│  │                                    │ │
│  │     [SIMPLE LINE CHART]            │ │
│  │     2004────────────────────2024   │ │
│  │     (Starts at $10K)                │ │
│  │                                    │ │
│  └────────────────────────────────────┘ │
│                                          │
│  📊 RESULTS                              │
│                                          │
│  Your Strategy (Balanced, 3x):           │
│    Return: 12.4% annually               │
│    Max Drawdown: -38%                   │
│    Sharpe Ratio: 0.95                   │
│                                          │
│  S&P 500 (Buy & Hold):                   │
│    Return: 10.2% annually               │
│    Max Drawdown: -57%                   │
│    Sharpe Ratio: 0.75                   │
│                                          │
│  ✅ Your strategy outperformed by 2.2%  │
│                                          │
│ [← BACK]  [SKIP THIS STEP]  [NEXT →]   │
└──────────────────────────────────────────┘
```

**Component Code (Pseudo):**
```jsx
function BacktestStep() {
  const [backtest, setBacktest] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Call backend to run 20-year backtest
    fetchBacktest({ 
      assets: selectedAssets, 
      riskProfile: 'balanced',
      leverage: 3.0 
    }).then(setBacktest);
  }, []);
  
  if (loading) return <LoadingSpinner />;
  
  return (
    <div className="backtest-step">
      <h2>STEP 2: Backtest</h2>
      <p>Let's test your strategy on 20 years of historical data</p>
      
      <BacktestChart data={backtest} />
      
      <ResultsComparison
        yourStrategy={backtest.your_strategy}
        benchmark={backtest.sp500}
      />
    </div>
  );
}
```

**Event Fired:**
```javascript
{
  event: "tutorial_step_2_completed",
  properties: {
    user_id: "xxx",
    backtest_time_duration: 3.2,  // seconds
    num_assets: 2,
    risk_profile: "balanced",
    leverage: 3.0,
    your_cagr: 0.124,
    sp500_cagr: 0.102,
    timestamp: "2026-06-09T14:38:00Z"
  }
}
```

**Acceptance Criteria:**
- [ ] Backtest runs in <3 seconds
- [ ] Chart displays properly (no visual bugs)
- [ ] Results accurate (matches backend calculation)
- [ ] Mobile: Chart readable on small screens

---

### 3.4 Step 3: Risk Profile

**URL:** `/onboarding/tutorial/step/3`  
**Duration:** 60 seconds  
**Learning Goal:** "Choose your risk tolerance (Conservative/Balanced/Aggressive)"

**UI Layout:**
```
┌──────────────────────────────────────────┐
│ LBH System Onboarding      [██████████░░] 60%│
├──────────────────────────────────────────┤
│                                          │
│  STEP 3: Risk Profile                    │
│  ════════════════════════════════════    │
│                                          │
│  Which best describes your comfort level?│
│                                          │
│  ┌─ CONSERVATIVE ────────────────────┐ │
│  │ 2.0x Leverage Maximum             │ │
│  │ Expected Return: 7-9% annually    │ │
│  │ Max Drawdown: -28%                │ │
│  │                                   │ │
│  │ Best for: Retirees, risk-averse   │ │
│  │                                   │ │
│  │ [SELECT THIS PROFILE]             │ │
│  └───────────────────────────────────┘ │
│                                          │
│  ┌─ BALANCED (RECOMMENDED) ──────────┐ │
│  │ ✓ SELECTED                        │ │
│  │ 3.0x Leverage Maximum             │ │
│  │ Expected Return: 8-11% annually   │ │
│  │ Max Drawdown: -38%                │ │
│  │                                   │ │
│  │ Best for: Most investors (default)│ │
│  │                                   │ │
│  │ [CURRENTLY SELECTED]              │ │
│  └───────────────────────────────────┘ │
│                                          │
│  ┌─ AGGRESSIVE ──────────────────────┐ │
│  │ 3.5x Leverage Maximum             │ │
│  │ Expected Return: 9-12% annually   │ │
│  │ Max Drawdown: -48%                │ │
│  │                                   │ │
│  │ Best for: Hedge funds, traders    │ │
│  │                                   │ │
│  │ [SELECT THIS PROFILE]             │ │
│  └───────────────────────────────────┘ │
│                                          │
│  💡 Pro Tip: You can change this anytime│
│             in Settings → Risk Profile   │
│                                          │
│ [← BACK]  [SKIP THIS STEP]  [NEXT →]   │
└──────────────────────────────────────────┘
```

**Component Code (Pseudo):**
```jsx
function RiskProfileStep() {
  const [selectedProfile, setSelectedProfile] = useState('balanced');
  
  const profiles = [
    { id: 'conservative', label: 'Conservative', leverage: 2.0, expectedReturn: '7-9%' },
    { id: 'balanced', label: 'Balanced (Recommended)', leverage: 3.0, expectedReturn: '8-11%' },
    { id: 'aggressive', label: 'Aggressive', leverage: 3.5, expectedReturn: '9-12%' }
  ];
  
  return (
    <div className="risk-profile-step">
      <h2>STEP 3: Risk Profile</h2>
      <p>Which best describes your comfort level?</p>
      
      {profiles.map(profile => (
        <ProfileCard
          key={profile.id}
          profile={profile}
          isSelected={selectedProfile === profile.id}
          onClick={() => setSelectedProfile(profile.id)}
        />
      ))}
    </div>
  );
}
```

**Event Fired:**
```javascript
{
  event: "tutorial_step_3_completed",
  properties: {
    user_id: "xxx",
    risk_profile_selected: "balanced",
    leverage_max: 3.0,
    expected_return: "8-11%",
    timestamp: "2026-06-09T14:41:00Z"
  }
}
```

**Acceptance Criteria:**
- [ ] One profile must be selected to proceed
- [ ] Profile descriptions clear and understandable
- [ ] Default selection is "Balanced" (recommended)
- [ ] Mobile: Card layout stacks properly

---

### 3.5 Step 4: Alerts

**URL:** `/onboarding/tutorial/step/4`  
**Duration:** 60 seconds  
**Learning Goal:** "Create first alert to get notifications"

**UI Layout:**
```
┌──────────────────────────────────────────┐
│ LBH System Onboarding      [████████████░] 80%│
├──────────────────────────────────────────┤
│                                          │
│  STEP 4: Alerts                          │
│  ════════════════════════════════════    │
│                                          │
│  Set up your first alert to get notified │
│  when assets reach your target RSI       │
│                                          │
│  ┌─ CREATE YOUR FIRST ALERT ──────────┐ │
│  │                                    │ │
│  │  Asset: [VTSAX ▼]                  │ │
│  │                                    │ │
│  │  Alert when RSI drops below:        │ │
│  │  [   30   ] ← Current: 28          │ │
│  │   ^                                │ │
│  │   (Lower = better buying zone)     │ │
│  │                                    │ │
│  │  Notification method:               │ │
│  │  ☑️  Email me                       │ │
│  │  ☐️  SMS me (requires phone #)     │ │
│  │                                    │ │
│  │  [CREATE ALERT]                    │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ✅ Alert created successfully!         │
│     You'll get an email when VTSAX      │
│     RSI drops below 30                  │
│                                          │
│ [← BACK]  [SKIP THIS STEP]  [NEXT →]   │
└──────────────────────────────────────────┘
```

**Component Code (Pseudo):**
```jsx
function AlertsStep() {
  const [asset, setAsset] = useState(selectedAssets[0]);
  const [rsiThreshold, setRsiThreshold] = useState(30);
  const [notificationMethods, setNotificationMethods] = useState({ email: true, sms: false });
  const [alertCreated, setAlertCreated] = useState(false);
  
  const handleCreateAlert = async () => {
    const alert = await createAlert({
      asset: asset.id,
      rsi_threshold: rsiThreshold,
      notification_email: notificationMethods.email,
      notification_sms: notificationMethods.sms
    });
    setAlertCreated(true);
  };
  
  return (
    <div className="alerts-step">
      <h2>STEP 4: Alerts</h2>
      <p>Set up your first alert to get notified</p>
      
      {!alertCreated ? (
        <AlertForm onSubmit={handleCreateAlert}>
          <AssetSelect value={asset} onChange={setAsset} />
          <RSIThresholdSlider value={rsiThreshold} onChange={setRsiThreshold} />
          <NotificationCheckbox value={notificationMethods} onChange={setNotificationMethods} />
          <Button type="submit">CREATE ALERT</Button>
        </AlertForm>
      ) : (
        <AlertSuccess asset={asset} threshold={rsiThreshold} />
      )}
    </div>
  );
}
```

**Event Fired:**
```javascript
{
  event: "tutorial_step_4_completed",
  properties: {
    user_id: "xxx",
    alert_created: true,
    asset_id: "VTSAX",
    rsi_threshold: 30,
    notification_email: true,
    notification_sms: false,
    timestamp: "2026-06-09T14:44:00Z"
  }
}
```

**Acceptance Criteria:**
- [ ] Alert can be created without required, or can be skipped
- [ ] Asset dropdown populated with user's favorites
- [ ] RSI slider intuitive (0-100 range)
- [ ] Email notifications work (test on backend)
- [ ] Success message confirms alert creation

---

### 3.6 Step 5: Success / Completion

**URL:** `/onboarding/tutorial/step/5`  
**Duration:** Immediate  
**Learning Goal:** "Celebrate and redirect to dashboard"

**UI Layout:**
```
┌──────────────────────────────────────────┐
│ LBH System Onboarding      [██████████████] 100%│
├──────────────────────────────────────────┤
│                                          │
│                                          │
│          🎉 YOU'RE ALL SET! 🎉           │
│                                          │
│  Congratulations! You've completed      │
│  the LBH System onboarding in           │
│  just 5 minutes.                        │
│                                          │
│  📊 You've Learned:                      │
│    ✅ How to screen assets              │
│    ✅ How backtesting works             │
│    ✅ How to choose your risk level     │
│    ✅ How to set up alerts              │
│                                          │
│  🚀 What's Next:                        │
│    1. Explore the Dashboard             │
│    2. Run your own backtest             │
│    3. Screen assets daily               │
│    4. Watch for your first alert        │
│                                          │
│  💡 Pro Tip:                             │
│    Join our Discord community to chat   │
│    with other LBH investors. 500+ users │
│    sharing strategies every day.        │
│                                          │
│                                          │
│  [GO TO DASHBOARD] [JOIN DISCORD]       │
│                                          │
│                                          │
└──────────────────────────────────────────┘
```

**Component Code (Pseudo):**
```jsx
function SuccessStep() {
  return (
    <div className="success-step">
      <h1>🎉 YOU'RE ALL SET! 🎉</h1>
      <p>You've completed the LBH System onboarding in 5 minutes.</p>
      
      <CompletionChecklist
        items={[
          "How to screen assets",
          "How backtesting works",
          "How to choose your risk level",
          "How to set up alerts"
        ]}
      />
      
      <Button 
        variant="primary" 
        size="large"
        onClick={() => router.push('/dashboard')}
      >
        GO TO DASHBOARD
      </Button>
      
      <Button 
        variant="secondary"
        onClick={() => window.open('https://discord.gg/lbh')}
      >
        JOIN DISCORD
      </Button>
    </div>
  );
}
```

**Event Fired:**
```javascript
{
  event: "tutorial_completed",
  properties: {
    user_id: "xxx",
    all_steps_completed: true,
    total_time_seconds: 285,  // 5 minutes
    assets_added: 2,
    alert_created: true,
    risk_profile_selected: "balanced",
    timestamp: "2026-06-09T14:46:00Z"
  }
}
```

**Acceptance Criteria:**
- [ ] Confetti animation or success visual works
- [ ] Buttons redirect to correct pages
- [ ] Discord link works and opens in new tab
- [ ] Mobile: Buttons are large and easy to tap

---

## SECTION 4: TUTORIAL NAVIGATION & STATE MANAGEMENT

### 4.1 State Architecture

```javascript
// Recommended: Use Context API or Redux for tutorial state

const TutorialContext = {
  currentStep: 1,  // 1-5
  completedSteps: [1],  // steps user has finished
  selectedAssets: ['VTSAX'],  // from step 1
  backtest: { /* backtest data */ },  // from step 2
  riskProfile: 'balanced',  // from step 3
  alert: { /* alert data */ },  // from step 4
  timestamp_started: '2026-06-09T14:30:00Z',
  
  // Methods
  goToStep: (step) => {},
  goToNextStep: () => {},
  goToPreviousStep: () => {},
  skipTutorial: () => {},
  completeTutorial: () => {},
  updateAssets: (assets) => {},
  updateRiskProfile: (profile) => {},
  updateAlert: (alert) => {}
};
```

### 4.2 Navigation Rules

```javascript
// Can user proceed to next step?

function canProceedToNextStep(currentStep) {
  switch(currentStep) {
    case 1:
      // Step 1 complete if: user added ≥1 asset OR clicked skip
      return selectedAssets.length >= 1 || skippedThisStep;
    
    case 2:
      // Step 2 complete if: backtest finished loading OR user skipped
      return backtest !== null || skippedThisStep;
    
    case 3:
      // Step 3 complete if: user selected a profile OR skipped
      return riskProfile !== null || skippedThisStep;
    
    case 4:
      // Step 4 complete if: user created alert OR skipped
      return alert !== null || skippedThisStep;
    
    case 5:
      // Step 5 is final; can only go to dashboard
      return true;
    
    default:
      return false;
  }
}

// Can user skip a step?
function canSkipStep(currentStep) {
  // All steps can be skipped EXCEPT step 1
  // (we need at least one asset to demonstrate)
  return currentStep !== 1;
}

// What happens if user declines risk disclaimer?
function handleDeclineDisclaimer() {
  // Log event
  fireEvent({
    event: "risk_disclaimer_declined",
    user_id: currentUser.id
  });
  
  // Redirect to dashboard (or landing page)
  // User can use free features without leverage
  router.push('/dashboard');
}
```

---

## SECTION 5: MOBILE RESPONSIVENESS

### 5.1 Responsive Breakpoints

```css
/* All tutorial components should be responsive: */

/* Desktop (1024px+) */
.tutorial-container {
  max-width: 800px;
  margin: 0 auto;
}

/* Tablet (768px - 1023px) */
@media (max-width: 1023px) {
  .tutorial-container {
    max-width: 90%;
    padding: 0 20px;
  }
}

/* Mobile (320px - 767px) */
@media (max-width: 767px) {
  .tutorial-container {
    max-width: 100%;
    padding: 0 12px;
  }
  
  .progress-bar {
    font-size: 12px;
  }
  
  .step-content {
    padding: 16px;
  }
  
  button {
    width: 100%;
    min-height: 48px;  // WCAG touch target
  }
  
  .tutorial-card {
    padding: 12px;  // Smaller padding on mobile
  }
}
```

### 5.2 Mobile Testing Checklist

```
[ ] iPhone 12 (375px width)
  - Tutorial fits without horizontal scroll
  - Text is readable (16px+ font size)
  - Buttons are tappable (44px+ height)
  - Images load and display correctly

[ ] iPad (768px width)
  - Layout uses tablet-optimized spacing
  - Cards display in 1-column layout
  - Charts readable on smaller screen

[ ] Android (360px width)
  - Same as iPhone testing
  - Test on both Chrome and native browser

[ ] Landscape orientation
  - UI reflows gracefully to landscape
  - Text doesn't overflow

[ ] Performance
  - Page load <3 seconds on 4G
  - Animations smooth (60 FPS)
  - No janky scrolling
```

---

## SECTION 6: PERFORMANCE TARGETS

### 6.1 Performance Metrics (Lighthouse)

| Metric | Target | Status |
|--------|--------|--------|
| **Desktop Lighthouse Score** | >85 | 🎯 Target |
| **Mobile Lighthouse Score** | >75 | 🎯 Target |
| **First Contentful Paint (FCP)** | <1.5s | 🎯 Target |
| **Largest Contentful Paint (LCP)** | <2.5s | 🎯 Target |
| **Cumulative Layout Shift (CLS)** | <0.1 | 🎯 Target |

### 6.2 Bundle Size Constraints

```javascript
// Estimated bundle size for tutorial feature:
// Components: 15 KB (gzipped)
// Styles: 8 KB (gzipped)
// Total added: ~23 KB (should be <50 KB total)

// Verify with:
npm run analyze
// Should show bundle size impact
```

### 6.3 API Response Time

```javascript
// All backend calls should be <1 second (p95)

// Backtest API
GET /api/backtest?assets=VTSAX,AAPL
Response time target: <3 seconds
Caching: Yes (cache for 1 hour)

// Screening API
GET /api/screening?limit=50
Response time target: <1 second
Caching: Yes (cache for 30 minutes)

// Alert creation
POST /api/alerts
Response time target: <500ms
```

---

## SECTION 7: TESTING & QA CHECKLIST

### 7.1 Manual Testing Scenarios

**Test Scenario 1: Happy Path (Complete All Steps)**
```
1. User logs in
2. Sees risk disclaimer modal
3. Clicks "I understand" checkbox (gets enabled)
4. Clicks "ACCEPT & CONTINUE"
5. Redirected to /onboarding/tutorial/step/1
6. Sees Step 1 (Screening)
7. Adds 2 assets to favorites
8. Clicks "NEXT"
9. Step 2 loads (backtest runs)
10. Backtest results display in <3 seconds
11. Clicks "NEXT"
12. Step 3 (Risk Profile) shows 3 options
13. Selects "Balanced" (pre-selected)
14. Clicks "NEXT"
15. Step 4 (Alerts) shows form
16. Creates alert for VTSAX with RSI=30
17. Clicks "NEXT"
18. Step 5 (Success) shows celebration screen
19. Clicks "GO TO DASHBOARD"
20. Redirected to /dashboard

EXPECTED RESULT: ✅ All steps completed, tutorial_completed event fired
```

**Test Scenario 2: Skip Steps**
```
1. User on Step 2 (Backtest)
2. Clicks "SKIP THIS STEP"
3. Proceeds to Step 3 (Risk Profile)
4. Clicks "SKIP THIS STEP" again
5. Proceeds to Step 4 (Alerts)
6. Completes step 4 (creates alert)
7. Proceeds to Step 5 (Success)

EXPECTED RESULT: ✅ Skipped steps don't block progress
```

**Test Scenario 3: Mobile Experience**
```
1. Open app on iPhone 12 (375px)
2. Disclaimer modal displays full-width (90%, max 480px)
3. Modal text readable without zoom
4. Buttons are 44px+ height
5. Tutorial cards stack vertically
6. Scroll horizontally? ❌ (No horizontal scroll needed)
7. Tap buttons easily without fat-finger errors

EXPECTED RESULT: ✅ Fully responsive, no horizontal scroll
```

**Test Scenario 4: Error Handling**
```
1. User on Step 2 (Backtest running)
2. API call times out or fails
3. See error message: "Backtest failed, please try again"
4. Click "RETRY"
5. API call succeeds, results display

EXPECTED RESULT: ✅ Graceful error handling
```

### 7.2 Automated Testing (Unit + Integration)

```javascript
// Example test suite structure (Jest/React Testing Library)

describe('Tutorial Component', () => {
  
  test('displays risk disclaimer on first login', () => {
    const { getByText } = render(<TutorialPage user={newUser} />);
    expect(getByText('IMPORTANT: RISK DISCLOSURE')).toBeInTheDocument();
  });
  
  test('checkbox must be checked to proceed', () => {
    const { getByRole } = render(<RiskDisclaimer />);
    const button = getByRole('button', { name: /ACCEPT/i });
    expect(button).toBeDisabled(); // Initially disabled
    
    const checkbox = getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(button).toBeEnabled(); // Enabled after checkbox
  });
  
  test('step 1 can proceed if asset added', () => {
    const { getByText, getByRole } = render(<ScreeningStep />);
    const addButton = getByRole('button', { name: /ADD/i });
    fireEvent.click(addButton);
    expect(getByText('NEXT')).not.toBeDisabled();
  });
  
  test('backtest renders in <3 seconds', async () => {
    const startTime = Date.now();
    const { getByText } = render(<BacktestStep />);
    await waitFor(() => expect(getByText('12.4% annually')).toBeInTheDocument());
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(3000);
  });
  
  test('events fire correctly for each step', () => {
    const { fireEvent } = render(<TutorialPage />);
    // Mock analytics
    jest.mock('mixpanel', () => ({
      track: jest.fn()
    }));
    
    // Complete step 1
    fireEvent.click(getByText('NEXT'));
    expect(mixpanel.track).toHaveBeenCalledWith('tutorial_step_1_completed', {...});
  });
});
```

### 7.3 Accessibility Testing (WCAG 2.1 AA)

```
[ ] Keyboard navigation
    - Tab through all interactive elements
    - Enter/Space activates buttons
    - Escape closes modals
    
[ ] Screen reader support
    - ARIA labels on buttons: <button aria-label="Add asset to favorites">
    - Form labels properly associated: <label htmlFor="asset-select">
    - Progress bar announces step: aria-label="Step 1 of 5"
    - Headings use proper hierarchy (h1, h2, h3)
    
[ ] Color contrast
    - Text on background >4.5:1 contrast ratio
    - Icons have sufficient contrast
    - Don't rely on color alone to convey information
    
[ ] Focus indicators
    - Visible focus ring on all buttons
    - Focus trap inside modal (can't tab out)
    
[ ] Motion/Animation
    - No animations triggered on page load
    - Animations respect prefers-reduced-motion
    - Confetti animations don't have flashing (>3 Hz)
```

---

## SECTION 8: BACKEND INTEGRATION POINTS

### 8.1 Required Backend APIs

**1. Risk Disclaimer Acceptance**
```
POST /api/user/accept-disclaimer
Request: { accepted: boolean }
Response: { success: true, user_id: "xxx" }
Backend action: Set user.has_seen_disclaimer = true
```

**2. Fetch Sample Assets for Screening**
```
GET /api/tutorial/sample-assets
Response: {
  assets: [
    { id: "VTSAX", rsi: 28, score: 4.3, label: "VTI equivalent" },
    { id: "AAPL", rsi: 35, score: 3.8 },
    ...
  ]
}
```

**3. Add Asset to Favorites**
```
POST /api/user/favorites
Request: { asset_id: "VTSAX" }
Response: { success: true, favorites: ["VTSAX"] }
```

**4. Run Backtest (Tutorial)**
```
POST /api/backtest/run
Request: {
  assets: ["VTSAX"],
  risk_profile: "balanced",
  leverage: 3.0,
  start_date: "2004-01-01",
  end_date: "2024-01-01"
}
Response: {
  your_strategy: {
    cagr: 0.124,
    max_drawdown: -0.38,
    sharpe: 0.95,
    equity_curve: [ ... ]
  },
  sp500: {
    cagr: 0.102,
    max_drawdown: -0.57,
    sharpe: 0.75,
    equity_curve: [ ... ]
  }
}
Timing: <3 seconds (cache result for 24 hours)
```

**5. Update Risk Profile**
```
POST /api/user/risk-profile
Request: { risk_profile: "balanced" }
Response: { success: true, user: { risk_profile: "balanced" } }
```

**6. Create Alert**
```
POST /api/alerts
Request: {
  asset_id: "VTSAX",
  rsi_threshold: 30,
  notification_email: true,
  notification_sms: false
}
Response: { success: true, alert_id: "xxx" }
Backend action: Set up alert trigger in monitoring system
```

### 8.2 Event Tracking Instrumentation

**Where in code to fire events:**

```javascript
// In Tutorial Component

// 1. When tutorial starts
useEffect(() => {
  mixpanel.track('tutorial_started', {
    user_id: user.id,
    timestamp: new Date().toISOString()
  });
}, [user]);

// 2. When each step completes
const handleNextStep = async () => {
  await markStepComplete(currentStep);
  mixpanel.track(`tutorial_step_${currentStep}_completed`, {
    user_id: user.id,
    ...stepSpecificData
  });
  goToNextStep();
};

// 3. When user skips
const handleSkip = () => {
  mixpanel.track('tutorial_skipped', {
    user_id: user.id,
    stopped_at_step: currentStep
  });
  router.push('/dashboard');
};

// 4. When tutorial completes fully
const handleTutorialComplete = () => {
  mixpanel.track('tutorial_completed', {
    user_id: user.id,
    total_time_seconds: (Date.now() - startTime) / 1000,
    all_steps_completed: true
  });
  router.push('/dashboard');
};
```

---

## SECTION 9: LAUNCH CHECKLIST

### Before Frontend Deployment

- [ ] **Design & Mockups Approved**
  - [ ] All 5 steps designed in Figma
  - [ ] Risk disclaimer modal copy final
  - [ ] Mobile layouts approved
  - [ ] Animations/micro-interactions defined

- [ ] **Component Development Complete**
  - [ ] All 5 tutorial step components built
  - [ ] Risk disclaimer modal component built
  - [ ] Navigation logic implemented
  - [ ] State management (Context/Redux) working
  - [ ] Event tracking integrated

- [ ] **Responsive Design Tested**
  - [ ] Desktop (1920px): ✅
  - [ ] Tablet (768px): ✅
  - [ ] Mobile (375px): ✅
  - [ ] Landscape orientation: ✅

- [ ] **Performance Verified**
  - [ ] Lighthouse Desktop: >85
  - [ ] Lighthouse Mobile: >75
  - [ ] Page load time: <3s (4G simulation)
  - [ ] Backtest API: <3s
  - [ ] No layout shift (CLS <0.1)

- [ ] **Accessibility Tested**
  - [ ] Keyboard navigation works
  - [ ] Screen reader compatible
  - [ ] Color contrast >4.5:1
  - [ ] Focus indicators visible
  - [ ] WCAG 2.1 AA compliance

- [ ] **Unit & Integration Tests Pass**
  - [ ] All jest tests pass
  - [ ] No console errors/warnings
  - [ ] E2E tests for critical flows
  - [ ] Mobile testing on real devices
  - [ ] Cross-browser tested (Chrome, Safari, Firefox)

- [ ] **Backend Integration Ready**
  - [ ] All APIs implemented and tested
  - [ ] Event tracking endpoints ready
  - [ ] Sample data available for tutorial
  - [ ] Backtest algorithm optimized (<3s)
  - [ ] Database migrations ready (if any)

- [ ] **Error Handling Complete**
  - [ ] API timeout errors handled
  - [ ] Network errors shown to user
  - [ ] Fallback content for failures
  - [ ] Retry logic implemented

- [ ] **Analytics Instrumentation Live**
  - [ ] Mixpanel events firing correctly
  - [ ] Events captured in dashboard
  - [ ] Test events visible in real-time
  - [ ] Data pipelines working

- [ ] **Documentation Complete**
  - [ ] Frontend implementation guide written
  - [ ] API documentation updated
  - [ ] Event taxonomy documented
  - [ ] Testing documentation ready

- [ ] **QA Sign-Off**
  - [ ] QA Lead approves all test cases passed
  - [ ] No critical bugs outstanding
  - [ ] Known limitations documented
  - [ ] Production ready: ✅

---

## APPENDIX: CODE EXAMPLES

### Example: TutorialContext (React)

```javascript
import { createContext, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import * as analytics from '@/utils/analytics';

export const TutorialContext = createContext();

export function TutorialProvider({ children, user }) {
  const router = useRouter();
  const [state, setState] = useState({
    currentStep: 1,
    selectedAssets: [],
    backtest: null,
    riskProfile: null,
    alert: null,
    startTime: Date.now(),
    skippedSteps: []
  });

  const goToStep = useCallback((step) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const completeStep = useCallback((step, data) => {
    analytics.track(`tutorial_step_${step}_completed`, {
      user_id: user.id,
      ...data,
      time_to_complete: (Date.now() - state.startTime) / 1000
    });
    
    setState(prev => ({
      ...prev,
      [`step${step}Data`]: data,
      currentStep: step + 1
    }));
  }, [user.id, state.startTime]);

  const skipTutorial = useCallback(() => {
    analytics.track('tutorial_skipped', {
      user_id: user.id,
      stopped_at_step: state.currentStep
    });
    router.push('/dashboard');
  }, [user.id, state.currentStep, router]);

  const completeTutorial = useCallback(() => {
    analytics.track('tutorial_completed', {
      user_id: user.id,
      total_time_seconds: (Date.now() - state.startTime) / 1000,
      all_steps_completed: true
    });
    router.push('/dashboard');
  }, [user.id, state.startTime, router]);

  return (
    <TutorialContext.Provider
      value={{
        state,
        goToStep,
        completeStep,
        skipTutorial,
        completeTutorial
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}
```

---

## SIGN-OFF

**Prepared by:** Product Lead  
**Date:** June 9, 2026  
**Status:** Ready for Frontend Implementation

**Frontend Lead Sign-Off:**
```
I have reviewed this specification and confirm:

☐ All requirements are clear and technically feasible
☐ Estimated effort: _____ hours
☐ Expected completion: _____ (date)
☐ No technical blockers identified

Signature: ________________  Date: __________
```

**CEO Approval:**
```
☐ Specification approved
☐ Ready to proceed with frontend development

Signature: ________________  Date: __________
```

---

**End of Onboarding Implementation Specification**
