# FRONTEND ARCHITECTURE — AAFIYA

## 1. Technical Stack
- **Framework:** Next.js 15.1.0 (App Router)
- **Runtime:** React 19.0.0
- **Styling:** Tailwind CSS 4.0.0 (Utility-first, CSS Variables-driven)
- **Icons:** Lucide React 0.454.0
- **Animations:** Motion (Framer Motion) 11.11.17
- **QR/Scanning:** React QR Code 2.2.0

## 2. Directory Structure
The project follows a standard Next.js App Router structure with localized component domains:

```text
/src
  /app           # Next.js App Router (Routes & Layouts)
  /components    # UI & Functional Components
    /ui          # Design System Primitives (Atoms)
    /shared      # Shared complex components (Molecules/Organisms)
    /[domain]    # Domain-specific components (Doctor, Patient, Admin, etc.)
  /data          # Mock Data & Static Content
  /lib           # Core Utilities & Constants
  /types         # Global TypeScript Interfaces
```

## 3. Global Configuration
- **Entry Point:** `src/app/layout.tsx` (Defines root HTML, RTL direction, and global fonts).
- **Global Styles:** `src/index.css` (Tailwind 4 configuration, custom utilities like `glass-effect` and `gradient-mesh`).
- **Font Strategy:**
  - **Amiri:** Primary Arabic UI font.
  - **Satisfy:** Accent/Brand font for Latin/Technical labels.
  - **Fallback:** Standard system sans-serif stack.

## 4. Layout Strategy
- **Root Layout:** `src/app/layout.tsx` handles the HTML shell.
- **Dashboard Layout:** `src/components/ui/DashboardLayout.tsx` provides a unified shell for all 11 roles, featuring:
  - Responsive Sidebar (Mobile/Desktop).
  - TopBar for role context and user status.
  - Content area with specialized RTL spacing.

## 5. Design Patterns
- **Atomic-ish UI:** Base components in `src/components/ui/` are reused across all dashboards.
- **Simulation-First:** Dashboards utilize specialized "Simulator" components (e.g., `BookingSimulatorModal`) to represent complex backend logic on the client.
- **RTL-First Design:** All layouts use Tailwind's logical properties or specific RTL adjustments (e.g., `dir="rtl"`, `-scale-x-100` for certain icons).

## 6. Build & Deployment
- The frontend is verified for production build via `next build`.
- Artifact removal: All `SpecViewer` and temporary development overlays have been removed as of the P11 cleanup.
