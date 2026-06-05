# GROWTH LAUNCH CHECKLIST & ACTION ITEMS
## LBH System — Sprint 1 (Jun 5-19) & Launch Week (Jun 19+)

**Last Updated:** June 5, 2026  
**Owner:** Growth Lead  
**Timeline:** 14 days to public launch

---

## TODAY (JUNE 5) — KICKOFF

### Morning (Before 12 PM)
- [ ] **Read** growth strategy doc + exec summary (30 min)
- [ ] **Share** with leadership + team (Slack message)
- [ ] **Schedule** growth strategy kickoff call (2 hours, this week)
- [ ] **Confirm** budget approval + headcount (hire Growth Content writer)

### Afternoon (12 PM - 6 PM)
- [ ] **List building:** Start LinkedIn search for 50 advisors (target: Brazil, independent)
- [ ] **Domain:** Reserve lbhsystem.com, lbh-invest.com (if not own)
- [ ] **Slack channel:** Create #lbh-sprint-updates (daily standup channel)
- [ ] **Analytics:** Confirm Mixpanel/Segment account access (for tracking)
- [ ] **Design brief:** Send landing page design brief to designer (hero, 3 value props, CTA)

### Evening (After 6 PM)
- [ ] **Review** competitor landing pages (Interactive Brokers, Quantfury) — screenshot 5 best
- [ ] **Template:** Create email outreach template (advisors, 3 versions)
- [ ] **Blog outline:** Start outline for first 3 blog posts (in doc)

**Owner:** Growth Lead  
**Success:** ✅ If landing page design starts, advisor list >30 names, blog outlines done

---

## DAYS 2-3 (JUNE 6-7) — FOUNDATION BUILDING

### Day 2: Content & Landing Page

**Content:**
- [ ] **Blog post #1 outline:** "Leverage Buy & Hold vs Normal B&H" (3k words, TOFU)
  - Sections: Definition, why it works, risks, backtests, comparisons, calls to action
  - Publish: Wednesday (Jun 7) OR Thursday (Jun 8)
  - Owner: Content writer (hire or freelance)

- [ ] **Blog post #2 outline:** "Kelly Criterion Explained" (4k words, TOFU)
  - Sections: Math basics, LBH use case, sizing examples, simulator demo
  - Timeline: Publish next week (Jun 14)

- [ ] **Landing page copy draft:**
  - Hero: "Automated Leverage for Buy & Hold Investors"
  - 3 value props: Smart Leverage | Proven Backtest | Simplified Dashboard
  - CTA: "Start Free 14-Day Trial"
  - Social proof: "500+ users in beta" / "NPS 45+" / "Used by advisors"
  - Owner: Growth lead (draft) + Designer (visual)

**Channels:**
- [ ] **Community setup:**
  - [ ] Create Discord server (invite friends to test)
  - [ ] Create Telegram group (PT-BR + EN channels)
  - [ ] Invite beta users (100 emails sent)
  - [ ] Set up welcome bot (auto-roles, channels)

**Metrics:**
- [ ] **Set up analytics tracking:**
  - [ ] Confirm Mixpanel account
  - [ ] Install tracking code on landing page (before Day 7)
  - [ ] Create custom events: signup, login, screening, backtest, simulator
  - [ ] Segment setup (user cohorts)
  - [ ] Dashboards: DAU, feature adoption, retention curves

**Owner:** Growth Lead + Content Writer + Designer  
**Success:** ✅ If blog outlines done, landing page copy drafted, Discord server 50+ members, analytics ready

---

### Day 3: Sales Preparation

**Advisor Outreach:**
- [ ] **List finalized:** 50 advisors identified (LinkedIn + manual search)
  - Fields: Name, email, company, AUM, region, contact method
  - Tool: Simple spreadsheet or Airtable (not CRM yet)
  - Export to CSV

- [ ] **Email templates drafted (3 versions):**
  1. **Cold outreach:** "Tool for your clients" angle
  2. **Warm intro:** "Your friend [X] suggested I reach out"
  3. **Follow-up:** "Quick question..."
  - A/B test later (measure open rate + response rate)

- [ ] **Pitch deck created** (1 slide, for calls):
  - Problem: Manual leverage sizing, slow
  - Solution: LBH System (automated, backtest-proven)
  - Offer: Free Enterprise tier (3 months) + white-label option
  - Timeline: 2-week pilot, then pricing

- [ ] **Partnership framework:**
  - [ ] White-label agreement template drafted
  - [ ] Revenue share terms: 20% of subscription fees (standard SaaS partnership)
  - [ ] OR: Flat fee per client ($99/month per advisor, unlimited clients)

**Broker Outreach (Quantfury):**
- [ ] **Contact info:** Compliance + BD lead at Quantfury
- [ ] **Pitch:** "White-label leverage intelligence tool"
- [ ] **Deck:** 1-pager showing ROI (users referred, retention)

**Affiliate Program:**
- [ ] **Program framework:** 30% lifetime value (max 12 months)
- [ ] **Recruitment list:** 20 financial influencers, traders, bloggers
- [ ] **Affiliate portal:** Set up (Refersion, Impact, or Tapfiliate)
- [ ] **Tracking:** Unique referral links, dashboard, monthly payouts

**Owner:** Sales Dev (or Growth Lead if founder-led)  
**Success:** ✅ If 50 advisors in list, 3 email templates drafted, pitch deck ready, partnership terms written

---

## DAYS 4-7 (JUNE 8-12) — BETA LAUNCH WEEK

### Day 4: Website & Analytics Live

- [ ] **Landing page live** (staging, not public yet)
  - [ ] Domain: lbhsystem.com or similar (LIVE)
  - [ ] Copy: All sections complete
  - [ ] Images: Logo, screenshots (3+)
  - [ ] CTA buttons: "Start Free" → redirects to signup
  - [ ] Mobile responsive: Test on phone
  - [ ] Analytics: Mixpanel tracking code live

- [ ] **Waitlist page live** (optional, if not launching beta immediately)
  - [ ] Email capture form
  - [ ] Estimate: "You're #X in queue"
  - [ ] Share referral link (viral feature)

- [ ] **Email sending setup:**
  - [ ] SendGrid or Mailchimp account configured
  - [ ] Welcome email template designed
  - [ ] 3-email onboarding sequence created (Day 0, Day 3, Day 7)
  - [ ] Sender: growth@lbhsystem.com (or noreply)

**Owner:** Growth Lead + Designer + Frontend  
**Success:** ✅ If landing page mobile-responsive, analytics working, email templates tested

---

### Day 5: Disclaimer & Legal

- [ ] **Risk Disclaimer modal live on app**
  - [ ] Content from Legal (Día 5, per Sprint plan)
  - [ ] Popup appears on first login
  - [ ] "Accept" button → stores acceptance in DB
  - [ ] PT-BR + EN versions
  - [ ] Test: Accept → can continue, Reject → redirect to disclaimer page

- [ ] **Terms of Service page**
  - [ ] Link on landing page footer
  - [ ] Also in app (Settings > Terms)
  - [ ] Signable format (PDF export option)

- [ ] **Privacy Policy**
  - [ ] GDPR + LGPD compliant (Legal team)
  - [ ] Link on landing page footer
  - [ ] Data retention policy: 5 years
  - [ ] User deletion: How to request (email)

**Owner:** Legal + Frontend  
**Success:** ✅ If disclaimer modal works, legal pages live, acceptance tracked

---

### Day 6: Beta User Onboarding

- [ ] **Beta user list (100-150 people):**
  - [ ] Friends, family, early advisors
  - [ ] Friends of founders (warm intros)
  - [ ] LinkedIn connections (relevant profile)
  - [ ] Reddit/Twitter followers (if applicable)
  - [ ] Spreadsheet with email + source

- [ ] **Beta launch email sent:**
  - [ ] Subject: "[Beta] LBH System — Automated Leverage for Long-Term Investing"
  - [ ] Content: What it is, how to get started, 14-day free trial, give us feedback
  - [ ] Link: https://app.lbhsystem.com/beta
  - [ ] Deadline: "Beta closes [date]"
  - [ ] Incentive: "First 100 beta users get 3 months free" (optional)

- [ ] **Discord welcome:**
  - [ ] Invite 50+ beta users to Discord
  - [ ] Pin: Quick start guide (5-step tutorial)
  - [ ] Channels: #general #feedback #bugs #feature-requests
  - [ ] Role: @Beta Tester (for onboarding tracking)

- [ ] **Onboarding tutorial:**
  - [ ] In-app: 5-step interactive tutorial (if not already built)
  - [ ] Step 1: Connect Quantfury account
  - [ ] Step 2: Screen assets (run default screening)
  - [ ] Step 3: View backtest (compare LBH vs. SPY)
  - [ ] Step 4: Adjust risk profile (Conservative/Balanced/Aggressive)
  - [ ] Step 5: Set alerts (RSI < 30)
  - [ ] Completion: "Congratulations! You're ready."

**Owner:** Growth Lead + Community Manager  
**Success:** ✅ If 100+ beta users invited, Discord active (10+ messages), onboarding flow works

---

### Day 7: First Metrics Review

- [ ] **Analytics dashboard operational:**
  - [ ] DAU, signups, conversion rate visible
  - [ ] Retention curves (D1, D7, D14)
  - [ ] Feature adoption (% using screening, backtest, etc.)
  - [ ] Cohort analysis (by source: Discord, email, etc.)

- [ ] **First metrics check (by 6 PM):**
  - [ ] Beta users signed up: Target 100+
  - [ ] Free accounts created: All beta users
  - [ ] Tutorial completion: Target >70%
  - [ ] Screening feature used: Target >80%
  - [ ] D1 retention: Target >85%
  - [ ] NPS survey (in-app): Send to all users

- [ ] **Blog post #1 published** (aim for early morning)
  - [ ] Title: "Leverage Buy & Hold: Why Automation Works"
  - [ ] 2,500+ words
  - [ ] Includes: Comparison table, backtest chart, CTAs
  - [ ] Publish on Medium + company blog (cross-post)
  - [ ] Share on Twitter, LinkedIn, Reddit
  - [ ] Owner: Content Writer

- [ ] **Pricing decision finalized** (Finance team)
  - [ ] Confirm 3 tiers: Free / Pro $29 / Premium $99
  - [ ] Communicate to team (all-hands meeting or email)

**Owner:** Growth Lead + Analytics  
**Success:** ✅ If 100+ beta users, >70% onboarding completion, blog post published, metrics visible

---

## DAYS 8-12 (JUNE 13-19) — BETA SCALING WEEK

### Day 8: Advisor Outreach Begins

- [ ] **Email sequence sent to 50 advisors:**
  - [ ] First email: "LBH System for your clients"
  - [ ] Personalized (name, firm): Not mass email
  - [ ] CTA: "2-min video demo" (link) + "Schedule call"
  - [ ] Send: Stagger over 2-3 days (50-60 per day)
  - [ ] Track: Open rate, click rate (Gmail + email tool)

- [ ] **Call calendar open:**
  - [ ] Calendly link: 30-min demo slots
  - [ ] Available: Wed-Fri, 10 AM - 2 PM (flexible timezone)
  - [ ] Booking link in email

- [ ] **Demo script prepared:**
  - [ ] Show LBH landing
  - [ ] Screening demo (live, if possible)
  - [ ] Backtest results (S&P 500 comparison)
  - [ ] White-label options + pricing
  - [ ] Questions: "What would help your clients most?"
  - [ ] Next step: "Let's pilot with 5 of your clients for free"

- [ ] **Expect:** 2-3 meetings Week 2

**Owner:** Sales Dev or Founder  
**Success:** ✅ If 50+ emails sent, 5+ calendar bookings, call script refined

---

### Days 9-10: YouTube & Social Media

- [ ] **YouTube channel created**
  - [ ] Channel name: "LBH System" or "Leverage Buy & Hold"
  - [ ] Profile image: Logo
  - [ ] Banner: Hero image
  - [ ] Description: "Automated leverage for long-term investors"
  - [ ] Links: Website, Discord, Twitter

- [ ] **Video #1 recorded & published:**
  - [ ] Title: "What is Leveraged Buy & Hold?" (5 min explainer)
  - [ ] Thumbnail: Clear, text overlay "Watch Now"
  - [ ] Description: Link to blog post + landing page
  - [ ] Tags: leverage, investing, buy and hold, portfolio
  - [ ] CTA: "Subscribe" + "Join Discord"

- [ ] **Social media posts (daily through Day 12):**
  - [ ] Twitter: 3-4 posts (M/W/F)
    - Sample: "Leverage + Buy & Hold = CAGR increase. But how do you size it right? Kelly Criterion answers that. #Investing #Leverage"
  - [ ] LinkedIn: 2 posts (M/W)
    - Sample: "Why advisors are adopting automated leverage. Here's the math."
  - [ ] Reddit: 1 post in r/brasil_investimentos + r/investing (by Day 12)
    - Sample: "I built a leverage screening tool. Early beta results: +35% CAGR vs. buy & hold (backtest). Would you use it?"

- [ ] **Influencer outreach (optional):**
  - [ ] Identify 5 micro-influencers in investing/quant space
  - [ ] DM on Twitter: "We'd love your feedback on our tool"
  - [ ] Offer: Free Pro tier for review/mention

**Owner:** Growth Lead + Video creator (freelance)  
**Success:** ✅ If YouTube video published, 3+ social posts live, 1+ Reddit post active

---

### Day 12: Mid-Sprint Review (Checkpoint)

- [ ] **Metrics review (all-hands, 30 min):**
  - [ ] Total users: Target 225+ (current?)
  - [ ] Paid (Pro) users: Target 32+ (current?)
  - [ ] MRR: Target $4.2k+ (current?)
  - [ ] D7 retention: Target >80% (current?)
  - [ ] Feature adoption: Screening 95%, Backtest 65%+
  - [ ] NPS: Target >40 (current?)

- [ ] **Blockers identified & escalated:**
  - [ ] Is onboarding broken? → Fix NOW
  - [ ] Is feature slow? → Optimize NOW
  - [ ] Are advisors not responding? → Adjust pitch, expand list
  - [ ] Is churn high? → Root cause analysis

- [ ] **Adjustments made (if needed):**
  - [ ] Change email subject lines (if low open rate)
  - [ ] Add feature (if adoption stuck)
  - [ ] Increase ad spend (if CAC too high from organic)
  - [ ] Revisit ICP (if wrong audience)

- [ ] **Forecast updated:**
  - [ ] "On track for 350 users by Day 19?" YES/NO
  - [ ] If NO: What do we need to change?

**Owner:** Growth Lead + PM  
**Success:** ✅ If metrics reviewed, blockers identified, adjustments decided

---

## DAYS 13-19 (JUNE 19-26) — PUBLIC LAUNCH WEEK

### Day 14 (Wednesday): Launch Preparation

- [ ] **Feature finalization:**
  - [ ] Pricing model live on app + landing page
  - [ ] "Upgrade to Pro" button works
  - [ ] Payment processor (Stripe) live
  - [ ] Test transaction (charge card, verify receipt email)

- [ ] **Blog post #2 published:**
  - [ ] Title: "Kelly Criterion: How to Size Your Leverage"
  - [ ] 3,500+ words
  - [ ] Include calculator or examples
  - [ ] CTAs to product

- [ ] **Press release drafted (optional):**
  - [ ] "LBH System Launches Public Beta"
  - [ ] Key points: What it is, market opportunity, founding team, link
  - [ ] Distribute to: TechCrunch, Cointelegraph (crypto angle if applicable), FinTech subreddits
  - [ ] Owner: Growth Lead + Communications (if you have comms person)

- [ ] **Email template #2 finalized:**
  - [ ] Subject: "LBH System is live—your automated leverage solution"
  - [ ] Content: What we built, why it matters, demo video, pricing, early-bird offer
  - [ ] Recipient: Waitlist + beta users + advisors
  - [ ] Schedule: Send on Day 19 at 9 AM ET

**Owner:** Growth Lead + Product + Communications  
**Success:** ✅ If payment system works, blog posts live, email ready, launch day confirmed

---

### Day 19 (Friday): PUBLIC LAUNCH 🚀

#### Morning (Before 9 AM ET):

- [ ] **Launch sequence:**
  1. Blog post #3 published: "LBH System is Live"
  2. Email to 500+ waitlist: "You're in—start free trial"
  3. Twitter announcement (thread): "We're live! Here's what we built"
  4. LinkedIn post: Founder story + company announcement
  5. Reddit post: r/brasil_investimentos + r/investing + r/stocks

#### 9 AM: Product Live
- [ ] Website live (public)
- [ ] App open for signups (no more beta gate)
- [ ] Email sequence starts
- [ ] Analytics tracking live

#### 9 AM - 5 PM: Monitoring
- [ ] Growth Lead monitoring dashboard (live)
- [ ] Watch for: Signup surge, server errors, support tickets
- [ ] Respond to: Twitter, Reddit, Discord questions
- [ ] Celebrate early wins (first 100 users, first paid customer)

#### After Hours:
- [ ] Daily standup (6 PM): Recap launch day metrics
- [ ] Sleep well! 😊

**Owner:** Full team  
**Success:** ✅ If launch announced, users sign up, no critical errors, positive feedback

---

### Sprint 1 End (Friday, June 19): Review + Retro (2 hours)

**Demo:**
- [ ] Live product demo (10 min)
- [ ] Show backtest + simulator (2 min)
- [ ] Show analytics/metrics (3 min)

**Metrics Review:**
- [ ] Total users: Actual vs. plan
- [ ] MRR: Actual vs. plan
- [ ] D7 retention: Actual
- [ ] CAC by channel: Actual
- [ ] NPS: Actual

**Gate 1 Decision: GO / NO-GO to Sprint 2**

**Go if:**
- ✅ 200+ users
- ✅ D7 retention >80%
- ✅ CAC <$100
- ✅ MRR >$3k

**Retro (30 min):**
- What went well?
- What could improve?
- What blockers did we hit?
- Lessons for Sprint 2

**Owner:** Growth Lead + PM  
**Success:** ✅ If all metrics reviewed, team aligned, GO decision made

---

## LAUNCH WEEK (JUN 19-26) — CONTINUED GROWTH

### Days 20-26: Momentum Build

- [ ] **Advisor pilots starting:**
  - [ ] 2-3 advisors onboarded
  - [ ] Each bringing 10-20 client signups
  - [ ] Track: Adoption, feedback, support needs
  - [ ] Aim: Lock 1 advisor as case study

- [ ] **Organic traffic ramping:**
  - [ ] Blog posts indexed by Google (check Search Console)
  - [ ] First organic signups (measure via UTM)
  - [ ] Aim: 50+ signups from blog/search

- [ ] **Community engagement:**
  - [ ] Discord 200+ members (up from beta 50)
  - [ ] Weekly AMA scheduled (Quant lead + Growth lead)
  - [ ] User spotlight feature (share top-performing portfolios)

- [ ] **Referral launches:**
  - [ ] In-app referral widget live
  - [ ] Incentive email: "Invite 3 friends → get 1 month free"
  - [ ] Track: Signups from referrals

**Owner:** Growth Lead + team  
**Success:** ✅ If 2+ advisor pilots active, 100+ organic visitors, referral signups flowing

---

## METRICS TRACKING (Daily)

**Create dashboard in Mixpanel / Amplitude with real-time updates:**

```
┌─────────────────────────────────────────┐
│ LBH System: Daily Growth Dashboard      │
├─────────────────────────────────────────┤
│ Date: June 5, 2026                      │
│                                         │
│ ACQUISITION                             │
│ New Users (Today):         15    ↑20%   │
│ Cumulative Users:          120   ↑12%   │
│ Signups by Source:                      │
│  - Direct:                 60    (50%)   │
│  - Discord:                40    (33%)   │
│  - Email/Link:             20    (17%)   │
│ Free → Pro Conversion:     14%   ↓1pp   │
│                                         │
│ ENGAGEMENT                              │
│ DAU (Yesterday):           80    ↑15%   │
│ Feature Usage:                          │
│  - Screening:              95%           │
│  - Backtest:               65%           │
│  - Simulator:              40%           │
│ Avg Session Duration:      8 min        │
│ Return Rate (D7):          86%           │
│                                         │
│ REVENUE                                 │
│ New Paid Signups:          2            │
│ Cumulative Paid Users:     32           │
│ MRR:                       $4.2k        │
│ ARPU:                      $131         │
│                                         │
│ QUALITY                                 │
│ NPS Score:                 42           │
│ Support Tickets:           3            │
│ Critical Bugs:             0            │
│                                         │
└─────────────────────────────────────────┘
```

**Metrics to track DAILY:**
1. Signups (total, by source)
2. Conversion rate (free → paid)
3. DAU
4. Feature usage (% of users)
5. D7 retention
6. MRR
7. CAC (blended)
8. NPS (weekly survey)
9. Support tickets + sentiment
10. Server uptime + errors

**Who checks:** Growth Lead (morning + evening)  
**Who reviews:** Entire team (Friday 4 PM standup)

---

## RESOURCE CHECKLIST

### Tools Needed (Sign Up / License)

- [ ] **Analytics:**
  - [ ] Mixpanel account (free tier ok for early stage)
  - [ ] Google Analytics 4 configured
  - [ ] Segment (optional, connects tools)

- [ ] **Email:**
  - [ ] SendGrid or Mailchimp (free tier for <10k emails)
  - [ ] Create from address: growth@lbhsystem.com
  - [ ] Email templates (Figma or Mailchimp template)

- [ ] **Community:**
  - [ ] Discord server created (free)
  - [ ] Telegram group (free)
  - [ ] Discord bot (e.g., MEE6) for welcome message

- [ ] **Social:**
  - [ ] Twitter account: @LBHSystem (or similar)
  - [ ] LinkedIn company page
  - [ ] Reddit accounts (optional)

- [ ] **Landing Page / Website:**
  - [ ] Domain: lbhsystem.com (or similar)
  - [ ] Hosting: Vercel, Netlify (free tier or cheap)
  - [ ] Template: Webflow, Carrd, or custom React
  - [ ] Payments: Stripe (free to set up)

- [ ] **CRM / Sales:**
  - [ ] Airtable or Spreadsheet (for advisor list)
  - [ ] Calendly (free) for booking calls
  - [ ] Gmail + Mailchimp automation

- [ ] **Video:**
  - [ ] Screen recorder: Loom (free tier)
  - [ ] Video editor: DaVinci Resolve or Adobe Premiere (if needed)
  - [ ] YouTube account

### People Needed (Hire by Day 1)

- [ ] **Content Writer (0.5 FTE):** $1.5-2k/month
  - Blog posts (1-2 per week)
  - Email copywriting
  - Landing page copy

- [ ] **Sales Dev (0.5 FTE):** $1.5-2k/month
  - Advisor outreach
  - Call follow-ups
  - Partnership negotiations

- [ ] **Community Manager (0.25 FTE):** $500-800/month (optional, can be Growth Lead)
  - Discord moderation
  - Weekly AMAs
  - User feedback collection

**Total hiring cost:** $3.5-4.8k/month (2-3 FTE contractors)

---

## RISK MITIGATION CHECKLIST

### Legal / Regulatory
- [ ] **CVM check:** Have we contacted Brazilian SEC about leverage fees?
  - Plan B: SaaS model (no leverage fee) if rejected
  - Responsible person: Legal Officer
  - Deadline: Day 1

- [ ] **Risk Disclaimer:** Is it clear, compelling, and legal?
  - Reviewed by external counsel: YES/NO
  - A/B tested acceptance: YES/NO
  - Tracking acceptance: YES/NO

### Product / Engineering
- [ ] **App stability:** Any critical bugs pre-launch?
  - Manual testing: Done by Dev team
  - Load testing: Done (simulate 500 concurrent users)
  - Error tracking: Sentry set up
  - Monitoring: Uptime alert configured

- [ ] **Payments:** Does Stripe integration work?
  - Test transaction successful: YES/NO
  - Refund process tested: YES/NO
  - Invoice email sent: YES/NO

### Marketing / Growth
- [ ] **Landing page conversion:** Is CTA button clear?
  - A/B tested: YES/NO
  - Mobile responsive: YES/NO
  - Mobile CTR tested: YES/NO

- [ ] **Email deliverability:** Are emails going to spam?
  - SPF/DKIM configured: YES/NO
  - Test email sent to Inbox: YES/NO
  - Unsubscribe working: YES/NO

### Community / Support
- [ ] **Community moderation:** Do we have rules + moderators?
  - Discord code of conduct: Written
  - Moderators: 2-3 people identified
  - Response time SLA: <4 hours for support questions

---

## BUDGET SUMMARY (14-Day Sprint)

| Item | Cost | Owner |
|------|------|-------|
| Content writer | $800 | Growth |
| Tools (Mixpanel, email, etc.) | $500 | Ops |
| Landing page design | $1,000 | Design |
| Video creation | $300 | Growth |
| Paid ads (optional test) | $500 | Growth |
| Advisor gifts/incentives | $200 | Sales |
| **Total Sprint Budget** | **$3,300** | — |

---

## SUCCESS CRITERIA (Go to Public Launch)

**MUST HAVE:**
- ✅ Disclaimer modal works + terms/privacy live
- ✅ Payment processor (Stripe) connected + tested
- ✅ 100+ beta users signed up
- ✅ >70% onboarding completion
- ✅ D7 retention >80%
- ✅ No critical bugs (Sentry clean)
- ✅ App loads <3s (lighthouse >60)

**NICE TO HAVE:**
- ✅ Blog post #1 published (SEO seed)
- ✅ YouTube video #1 published
- ✅ 5+ advisor meetings booked
- ✅ 10+ social media followers

**HARD STOP (Don't Launch If):**
- ❌ Server downtime >2 hours
- ❌ Payment processor down
- ❌ Legal blocker (CVM)
- ❌ Critical security issue

---

## NOTES FOR GROWTH LEAD

**Pace Yourself:**
- Week 1 (Jun 5-12): Intense setup phase
- Week 2 (Jun 13-19): Execution + fine-tuning
- Post-launch (Jun 19+): Monitoring + optimization

**Daily Standup Template (Post to Slack 9 AM + 6 PM):**
```
🚀 LBH Growth Daily Standup — [DATE]

✅ Yesterday:
- Completed [X]
- Acquired [X] new users
- Processed [X] revenue

🎯 Today:
- Will complete [X]
- Target [X] new signups
- Working on [X]

🚧 Blockers:
- [Issue]: Impact [severity]
- Help needed from [person]

📊 Metrics:
- DAU: [X] (+Y%)
- MRR: $[X] (+Y%)
- Conversion: X% (target 15%)
- CAC: $[X] (target <$50)
```

**Weekly Priorities (Friday EOD):**
- Review dashboard
- Identify top 3 growth levers for next week
- Update forecast
- Celebrate wins

**Remember:**
- Growth is a team sport — keep everyone aligned
- Data > opinions — trust the metrics
- Speed > perfection — launch, learn, iterate
- Focus > breadth — don't chase every channel

---

**Owner:** Growth Lead  
**Created:** June 5, 2026  
**Status:** 📋 Ready to Execute  
**Last Updated:** June 5, 2026
