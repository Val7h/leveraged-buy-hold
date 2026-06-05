#!/bin/bash

# LBH SYSTEM - GIT SETUP FOR SPRINT 1
# Run this IMMEDIATELY after kickoff meeting
# Owner: Dev Lead
# Time: ~5 minutes

set -e  # Exit on error

echo "🚀 LBH System Sprint 1 Git Setup"
echo "=================================="
echo ""

# Navigate to project root
cd /Users/Admin/leveraged-buy-hold || cd C:\\Users\\Admin\\leveraged-buy-hold

# Create feature branches for each team

echo "📦 Creating feature branches..."

# 1. Backend Performance Optimization
git checkout -b sprint-1-backend-performance
git push -u origin sprint-1-backend-performance
echo "✅ Created: sprint-1-backend-performance"

# 2. Frontend Mobile UX & Lighthouse
git checkout -b sprint-1-frontend-ux
git push -u origin sprint-1-frontend-ux
echo "✅ Created: sprint-1-frontend-ux"

# 3. Legal Compliance & Disclaimer
git checkout -b sprint-1-legal-compliance
git push -u origin sprint-1-legal-compliance
echo "✅ Created: sprint-1-legal-compliance"

# 4. Risk Management & Insurance
git checkout -b sprint-1-risk-management
git push -u origin sprint-1-risk-management
echo "✅ Created: sprint-1-risk-management"

# 5. Growth & Marketing
git checkout -b sprint-1-growth
git push -u origin sprint-1-growth
echo "✅ Created: sprint-1-growth"

# 6. Tests & CI/CD
git checkout -b sprint-1-tests-cicd
git push -u origin sprint-1-tests-cicd
echo "✅ Created: sprint-1-tests-cicd"

# Back to main
git checkout main

# Create directories for documentation
mkdir -p .sprint1
mkdir -p .sprint1/backend
mkdir -p .sprint1/frontend
mkdir -p .sprint1/legal
mkdir -p .sprint1/risk
mkdir -p .sprint1/growth
mkdir -p .sprint1/docs

echo ""
echo "📁 Created Sprint 1 directory structure"

# Create main tracking document
cat > .sprint1/SPRINT1_STATUS.md << 'EOF'
# Sprint 1 Status Tracking

**Sprint:** June 5-19, 2026
**Goal:** Beta launch with compliance & performance
**Status:** 🔄 IN PROGRESS

## Team Status

| Team | Branch | Status | Owner |
|------|--------|--------|-------|
| Backend | sprint-1-backend-performance | 🔄 | Backend Lead |
| Frontend | sprint-1-frontend-ux | 🔄 | Frontend Lead |
| Legal | sprint-1-legal-compliance | 🔄 | Legal Lead |
| Risk | sprint-1-risk-management | 🔄 | Risk Lead |
| Growth | sprint-1-growth | 🔄 | Growth Lead |
| Tests | sprint-1-tests-cicd | 🔄 | Dev Lead |

## Critical Path

- [ ] D1-2: Legal customization + CVM query
- [ ] D3-4: Backend performance baseline
- [ ] D5: Disclaimer modal spec complete
- [ ] D7: Legal documents approved
- [ ] D8: Pricing live + backend <2s
- [ ] D10: Frontend Lighthouse >85
- [ ] D14: Final testing + GO/NO-GO

## Blockers

(None yet - meeting just started!)

## Decisions

- Pricing: ✅ Freemium $19/mo
- CVM: ✅ Query semana 1
- Launch: ✅ June 19 target

---
Last updated: June 6, 9 AM
EOF

echo "✅ Created: .sprint1/SPRINT1_STATUS.md"

# Create .gitignore entries for sprint1
cat >> .gitignore << 'EOF'

# Sprint 1 temporary files
.sprint1/temp/
.sprint1/*.tmp
.sprint1/*.log
EOF

# Commit structure
git add .sprint1/ .gitignore
git commit -m "🚀 Sprint 1 Git structure setup

- Create feature branches for 6 teams
- Add sprint tracking documentation
- Add .sprint1 directory for coordination

Co-Authored-By: Dev Lead <dev@lbhsystem.com>"

git push origin main

echo ""
echo "✅ Git setup complete!"
echo ""
echo "Next steps:"
echo "1. Each team: git checkout YOUR_BRANCH"
echo "2. Each team: Create commits with 'WIP:' prefix (work in progress)"
echo "3. Dev Lead: Create pull requests daily for review"
echo "4. Friday: Merge all PRs to main (weekly release)"
echo ""
echo "📅 Daily standup: 8 AM BRT"
echo "📅 Weekly review: Friday 4 PM"
echo ""
