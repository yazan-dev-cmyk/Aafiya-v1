# RTL DOCUMENTATION — AAFIYA

## 1. Overview
Aafiya is designed as an **Arabic-First** application. The entire UI is built to support Right-to-Left (RTL) directionality by default.

## 2. Global Direction
- **Implementation:** `dir="rtl"` and `lang="ar"` are set on the `<html>` tag in `src/app/layout.tsx`.
- **Effect:** All browsers and layout engines automatically reverse the flow of elements, text alignment, and scrollbars.

## 3. Tailwind CSS & RTL
- **Logical Properties:** The project utilizes Tailwind 4's built-in support for logical properties (e.g., `ps-4`, `pe-8`, `border-s`, `rounded-e`).
- **Manual Adjustments:** Where logical properties are insufficient, specific RTL classes are used:
  - `right-0` (instead of left-0) for fixed sidebars.
  - `-scale-x-100` for mirroring icons that have a specific direction (e.g., arrows, stethoscopes).

## 4. Component-Specific RTL Logic

### 4.1 Dashboard Sidebar
- Anchored to the **right** side of the screen.
- Icons are placed on the **right** of the text labels.
- The mobile drawer slides in from the **right**.

### 4.2 Form Layouts
- Labels are right-aligned.
- Input icons are placed on the right of the field (`ps-10`).
- Error messages and help text are right-aligned.

### 4.3 Typography Alignment
- Primary text alignment is `text-right`.
- Headings use `leading-tight` and `tracking-tight` optimized for the **Amiri** font.

## 5. Challenges & Solutions
- **Icon Mirroring:** Lucide icons like `ArrowRight` are mirrored to represent "forward" in an RTL context.
- **English/Technical Terms:** English words (like "Aafiya") and numbers (like 1.0) maintain their LTR order within the RTL flow, handled natively by the browser.

---
**Authority:** [AAFIYA — FRONTEND FREEZE BASELINE](../../AAFIYA_FRONTEND_FREEZE_BASELINE.md)
