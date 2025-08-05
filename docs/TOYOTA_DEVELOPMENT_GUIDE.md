# 🚛 Toyota Development Guide

## Core Philosophy: "Never Break What Works"

This guide implements Toyota's manufacturing principles for software development to prevent feature additions from breaking existing functionality.

## 🔒 Golden Rules

### 1. Feature Flags First
- **ALL** new features MUST be behind feature flags
- Features default to `false` (disabled)
- Can be instantly disabled if they break baseline functionality

### 2. Baseline Protection
- Core game flow is sacred and cannot be modified by features
- Features extend functionality, they don't replace it
- If baseline breaks during feature development, STOP and revert

### 3. Stop the Line Principle
- If ANY basic function breaks: STOP immediately
- Don't try to "fix forward" - revert to working state
- Understand root cause before continuing

## 🏗️ Development Workflow

### Phase 1: Feature Branch
```bash
# NEVER develop features on main
git checkout -b feature/your-feature-name

# Develop in isolation
# Test extensively  
# Verify baseline STILL works
```

### Phase 2: Feature Flag Implementation
```typescript
// Add to frontend/src/config/features.ts
export const FEATURES = {
  YOUR_FEATURE: process.env.VITE_ENABLE_YOUR_FEATURE === 'true',
  // ...
};
```

### Phase 3: Wrap Feature in Component
```jsx
import { FeatureWrapper } from '../components/FeatureWrapper';

// Wrap new functionality
<FeatureWrapper feature="YOUR_FEATURE" debugName="Feature Description">
  <YourNewFeature />
</FeatureWrapper>
```

### Phase 4: Baseline Testing
Before ANY commit, verify these work:
- ✅ White creates room → escrow creation succeeds
- ✅ Black joins room → sees single clear action  
- ✅ Both deposit → game starts
- ✅ Chess pieces move → no bouncing/blocking
- ✅ Basic game flow → start to finish works

### Phase 5: Canary Deployment
```bash
# Deploy with feature disabled
git push origin feature/your-feature

# Test in production with feature disabled
# Enable feature via environment variable
# Monitor for any baseline breakage
# Disable instantly if issues occur
```

## 🚨 Emergency Procedures

### If Feature Breaks Baseline
1. **STOP** development immediately
2. **Disable** feature via feature flag
3. **Revert** if flag doesn't fix it
4. **Analyze** what went wrong
5. **Redesign** approach to avoid interference

### Feature Flag Emergency Disable
```bash
# Instantly disable problematic feature
# Set environment variable to 'false'
# Or modify features.ts default to false
# Push emergency fix
```

## 📋 Baseline Test Checklist

Copy this checklist for every feature:

```
□ White player can create room without errors
□ White player escrow creation succeeds  
□ Black player can join room
□ Black player sees clear single action
□ Black player can create escrow
□ Game starts when both escrows ready
□ Chess pieces can be selected and moved
□ Moves persist and sync between players
□ Game can be completed (checkmate/draw)
□ No JavaScript errors in console
□ No broken UI elements
□ Performance is not degraded
```

## 🛠️ Feature Development Patterns

### ✅ GOOD: Additive Features
```jsx
// Feature adds new functionality without modifying existing
<LobbyView>
  {/* Existing core lobby logic unchanged */}
  <CoreLobbyFunctionality />
  
  {/* New feature added separately */}
  <FeatureWrapper feature="RECONNECTION">
    <ReconnectionPanel />
  </FeatureWrapper>
</LobbyView>
```

### ❌ BAD: Modifying Core Logic
```jsx
// DON'T modify existing conditions with feature logic
const readyToDeposit = bothPlayersPresent && !gameStarted && reconnectionLogic;

// DO keep core logic pure, add features separately  
const readyToDeposit = bothPlayersPresent && !gameStarted;
```

## 🎯 Feature Categories

### Safe Features (Low Risk)
- UI enhancements that don't affect logic
- Additional buttons/panels
- Analytics and logging
- Visual improvements

### Risky Features (High Risk)  
- Anything modifying game state logic
- Authentication/session management
- Database schema changes
- Network/WebSocket modifications

## 📊 Feature Monitoring

### Development Monitoring
```javascript
// Check feature status
import { getFeatureStatus } from '../config/features';
console.table(getFeatureStatus());
```

### Production Monitoring
- Monitor error rates after feature deployments
- Watch for baseline functionality regressions
- Have rollback plan ready

## 🚛 Toyota Sayings for Developers

> "If it ain't broke, don't fix it. If you must fix it, don't break it."

> "Features that break baseline functionality aren't features - they're bugs."

> "A working simple system beats a broken complex system every time."

> "Stop the line when quality suffers."

---

**Remember: The goal is not to build the most features. The goal is to build a reliable system that just works.** 🚛