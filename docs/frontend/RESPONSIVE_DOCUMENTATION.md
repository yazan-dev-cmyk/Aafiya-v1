# RESPONSIVE DOCUMENTATION — AAFIYA

## 1. Breakpoint Strategy
Aafiya uses Tailwind's default mobile-first breakpoint system:
- **Mobile:** `< 640px` (Default)
- **Tablet (sm/md):** `640px` to `1024px`
- **Desktop (lg):** `1024px` to `1280px`
- **Wide Desktop (xl/2xl):** `> 1280px`

## 2. Global Layout Adaptations

### 2.1 Sidebar (`DashboardLayout.tsx`)
- **Desktop (lg+):** Fixed sidebar on the right (in RTL), integrated into the grid.
- **Mobile/Tablet:** Hidden by default. Triggered via a hamburger menu in the header, appearing as a full-height overlay drawer.

### 2.2 Navigation (`Header.tsx`)
- **Desktop:** Horizontal nav links.
- **Mobile:** Links are moved into a secondary mobile menu or the Auth modal selection.

### 2.3 Grid Layouts
- **Cards/Sections:** Usually `grid-cols-1` on mobile, `grid-cols-2` on tablet, and `grid-cols-3` or `grid-cols-4` on desktop (e.g., `WhyUsSection`, `FeaturesSection`).

## 3. Component-Specific Responsiveness

### 3.1 Tables (`src/components/ui/Table.tsx`)
- **Implementation:** Wrapped in `overflow-x-auto`. On very small screens, certain columns (e.g., UUID, secondary metadata) are hidden using `hidden md:table-cell`.

### 3.2 Modals
- Width scales from `w-[95%]` on mobile to fixed widths (e.g., `max-w-2xl`) on desktop.
- Scrollable content areas ensured for smaller viewports.

### 3.3 Hero Section
- **Mobile:** Stacked layout with centered text and primary CTA.
- **Desktop:** Side-by-side layout with text on one side and the simulation graphic/card on the other.

## 4. Responsive Utilities
- **Typography:** Scaling font sizes (e.g., `text-3xl md:text-5xl`).
- **Spacing:** Adaptive padding and margins (e.g., `px-4 md:px-8`).

---
**Authority:** [AAFIYA — FRONTEND FREEZE BASELINE](../../AAFIYA_FRONTEND_FREEZE_BASELINE.md)
