# Timeless Calendar - Work Log

## October 5, 2025

### Session: Mobile Safari Crash Fix
Time: Evening
Task: Debug and fix "A problem repeatedly occurred" crash on iOS Safari

#### Problem
- Deployed site crashed on mobile Safari with "A problem repeatedly occurred" error
- Site worked perfectly on desktop browsers
- Safari Web Inspector showed no JavaScript errors (crash happened before errors could be logged)
- Network tab showed spinning pinwheel when clicking JS files

#### Root Cause
**Excessive DOM size on mobile**: Calendar was rendering 364 DayCell components initially (26 weeks × 2 × 7 days), which exceeded iOS Safari's memory limits.

#### Solution
Reduced BUFFER_WEEKS from 26 to 4 on mobile devices (≤768px width), reducing initial render from 364 to 56 DayCell components (85% reduction).

```javascript
// Before: Same buffer for all devices
const BUFFER_WEEKS = 26;

// After: Mobile-optimized buffer
const BUFFER_WEEKS = typeof window !== 'undefined' && window.innerWidth <= 768 ? 4 : 26;
```

#### Debugging Process
1. Initially suspected third-party libraries:
   - Temporarily removed date-fns → No effect
   - Disabled kbar (command palette) → No effect
   - Disabled framer-motion → No effect
   - Added Eruda mobile debugging console → Confirmed no JS errors

2. Identified DOM size as likely culprit after library elimination
3. Reduced mobile buffer weeks → **Fixed immediately**

#### Files Modified
- `/src/components/Calendar.jsx` - Reduced mobile buffer weeks
- `/src/components/DayCell.jsx` - Added window guards to `window.innerWidth` checks
- `/src/App.jsx` - Re-enabled all features after fix

#### Key Learnings
1. **Mobile memory limits are real**: 364 DOM elements crashed iOS Safari but worked fine on desktop
2. **Library elimination debugging**: Systematic disabling of features helps isolate root cause
3. **Window guards**: Always check `typeof window !== 'undefined'` before accessing window properties in SSR-compatible code
4. **Infinite scroll strategy**: Initial buffer should be minimal on mobile, rely on IntersectionObserver to load more

#### Git Commits
- "Add window guards to DayCell window.innerWidth checks"
- "Reduce mobile buffer weeks to fix Safari crash"
- "Re-enable all features after fixing mobile crash"

#### Performance Impact
- Mobile: 56 initial DayCell components (was 364)
- Desktop: 364 initial DayCell components (unchanged)
- Mobile scrolling: IntersectionObserver loads 10 additional weeks when needed

Energy Level: Methodical debugging, successful resolution
Next Step: Monitor mobile performance and adjust LOAD_WEEKS if needed

---

## October 4, 2025

### Session: UI Polish & Today Cell Highlighting Fix
Time: Evening
Task: Fix today cell red highlighting, restore rounded card design, enhance event styling

Accomplished:
- Fixed today cell not showing red by using more specific CSS selectors with !important
- Restored rounded card design from commit 7645242 with 14px border radius
- Changed today cell color to custom red #D43E44 (softer than original)
- Enhanced event/note cards with gradient backgrounds and layered shadows
- Improved text contrast for event text (darker at 88% opacity)
- Lightened event card backgrounds for better contrast
- Added letter-spacing to month/weekday labels (0.18em/0.24em)
- Made today's event text bold for emphasis

Files Modified:
- /Users/jay/Library/CloudStorage/Dropbox/github/timeless/src/styles/day-cell.css
- /Users/jay/Library/CloudStorage/Dropbox/github/timeless/README.md
- /Users/jay/Library/CloudStorage/Dropbox/github/timeless/docs/work-log.md

Git Commits:
- "Fine-tune today cell styling with softer red color"
- "Refine today cell text styling for better balance"
- (Pending) "Enhance event card styling and improve documentation"

Notes:
- CSS specificity was the main issue with today highlighting - needed `.day-cell.today.day-cell--baseline`
- Edit tool has strict matching requirements causing multiple attempts
- User preferred softer red (#D43E44) over harsh red (#C92228)

Energy Level: Productive, iterative refinement
Next Step: Continue polishing UI details based on user feedback

---

### Session: Keyboard Shortcuts Refinement

#### Changes Made
1. **Help Overlay Improvements**
   - Fixed wiggling/reordering animation issues
   - Removed individual item animations to prevent layout shifts
   - Added smooth section-level animations with staggered delays
   - Removed "Move (nav)" entry (redundant with nav mode arrows)
   - Added "Save & Exit" with Return key

2. **Keyboard Shortcut Updates**
   - Changed "Add Note to Today" from `n` to `c`
   - Added `T` (capital) as alternate for "Add Note to Today"
   - Added `n`/`p` for next/previous month navigation
   - Added `N`/`P` for next/previous year navigation (12-month jumps)
   - Updated help overlay to reflect all new shortcuts

3. **Documentation Updates**
   - Reorganized README keyboard shortcuts into Navigation/Editing/System sections
   - Added all new shortcuts with proper formatting
   - Updated work log with session details

#### Technical Details
- Modified `/src/hooks/useKeyboardShortcuts.js` for new key bindings
- Updated `/src/components/HelpOverlay.jsx` with animation fixes
- Branch `shadcn-help` merged into `main`

---

## October 3, 2025

### Session: Layout Overhaul & Spacing Improvements

#### Problems Addressed
1. **Mini calendar disappearing issue** (Critical)
   - Root cause: Position sticky inside scrolling container
   - Calendar auto-scroll to today moved the sticky rail off-screen
   - Multiple cascading issues masked the real problem

2. **Calendar cutoff on right edge**
   - Compound padding from nested containers
   - Hidden overflow masked the actual overflow issue

3. **Poor spacing and sizing**
   - Components too large and cramped
   - No max-width constraints for ultra-wide monitors
   - UI stuck to left side on large displays

#### Solutions Implemented

##### Fixed Positioning System
```css
.calendar-rail {
  position: fixed;
  top: 3rem;
  left: max(2rem, calc((100vw - 1500px) / 2 + 2rem));
  width: 240px;
}

.calendar-layout {
  padding-left: 380px;
  max-width: 1500px;
  margin: 0 auto;
}
```

##### Component Size Reductions
- Calendar rail: 260px → 240px width
- Brand title: 1.1rem → 1rem
- Mini calendar months: 200px → 180px
- Mini calendar fonts: 0.82em → 0.75em
- Overall padding: Reduced by ~25%

##### Layout Constraints
- App shell max-width: 1800px
- Calendar max-width: 1500px (1200px content area)
- Spacing between sidebar and content: 380px

#### Lessons Learned
1. **Position fixed vs sticky**: Fixed positioning required for sidebars with infinite scroll
2. **Debug overflow issues**: Temporarily set `overflow: visible` to see true bounds
3. **Check media queries**: Hidden `display: none` can cause mysterious disappearances
4. **Component hierarchy matters**: CSS can't fix structural React issues

#### Time Spent
- Debugging mini calendar: ~45 minutes
- Layout fixes: ~30 minutes
- Documentation: ~15 minutes

#### Mobile Layout Implementation
- Created responsive mobile layout (≤768px)
- One day per row display with horizontal layout
- Hidden mini calendar for maximum content space
- Touch-optimized with larger tap targets
- Full width calendar utilization

#### UI Centering Fix
- Treated sidebar + calendar as single 1500px block
- Entire UI centers on displays >1600px
- Proper alignment formula: `calc(50% - 750px + 2rem)`

#### Next Steps
- Add animation transitions for smoother interactions
- Consider swipe gestures for mobile navigation
- Add mobile-specific navigation controls

---

## Previous Sessions

### October 2, 2025
- Initial React migration from vanilla HTML/CSS/JS
- Implemented infinite scroll with React hooks
- Set up Vite build system

### October 1, 2025
- Fixed sticky header issues with three-layer z-index architecture
- Resolved Vite CSS @import errors
- Implemented experimental mode system