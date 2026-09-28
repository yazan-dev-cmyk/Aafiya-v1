# DESIGN SYSTEM DOCUMENTATION — AAFIYA

## 1. Visual Philosophy
Aafiya utilizes a **high-contrast, professional medical theme** designed for clarity and trust. The system is built on Tailwind CSS 4 logical properties to support RTL (Arabic) as the primary direction.

## 2. Color Palette
Defined in `src/index.css` via CSS variables.

### 2.1 Primary Colors
- **Primary:** `#0077B6` (Medical Blue / Health Blue)
- **Secondary:** `#48C774` (Healing Green)
- **Foreground:** `#FFFFFF`

### 2.2 Neutral Scale (Slate)
- **Slate 50-200:** Backgrounds and border accents.
- **Slate 400-600:** Secondary text and inactive states.
- **Slate 700-950:** Primary text, headings, and dark mode backgrounds.

## 3. Typography
Detailed in [TYPOGRAPHY_DOCUMENTATION.md](./TYPOGRAPHY_DOCUMENTATION.md).

## 4. Structural Tokens
- **Radius:** 
  - `sm`: 4px, `md`: 8px, `lg`: 12px, `xl`: 16px, `2xl`: 24px.
- **Shadows:**
  - `sm`, `md`, `lg`, `xl` (Soft medical depth).
- **Glass Effect:** `backdrop-filter: blur(12px)` with `rgba(255, 255, 255, 0.85)`.

## 5. UI Primitives
- **Buttons:** 
  - Variants: `primary`, `secondary`, `outline`, `ghost`, `link`.
  - Sizes: `sm`, `md`, `lg`.
- **Inputs:** 
  - Focus state: `primary` ring with subtle background shift.
- **Cards:** 
  - Standardized `shadow-sm` and `border-slate-200`.

## 6. Layout Shell (`DashboardLayout.tsx`)
- **Header:** Sticky, glass-effect, includes role metadata.
- **Sidebar:** Left-anchored (in RTL), mobile-overlay capable.
- **Content:** Centered `max-w-7xl` with `animate-in` transitions.

## 7. Interactive Feedback
- **Dark Mode:** Supported via `isDarkMode` state in `DashboardLayout`, toggling `bg-slate-950`.
- **Selection:** `bg-teal-500 text-white`.
- **Transitions:** `duration-300` for color shifts, `duration-500` for page entries.
