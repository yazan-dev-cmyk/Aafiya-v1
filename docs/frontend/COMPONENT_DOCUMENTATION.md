# COMPONENT SPECIFICATIONS — AAFIYA

## 1. DashboardLayout (`src/components/ui/DashboardLayout.tsx`)
The primary shell for all authenticated views.

- **Purpose:** Provide a consistent navigation and layout environment across all 11 roles.
- **Props:**
  - `children`: ReactNode (Main content).
  - `role`: RoleType (Current user role).
  - `sidebarItems`: NavItem[] (Role-specific navigation).
  - `activeTab`: string (Current active module).
  - `onTabChange`: (tab: string) => void (State updater).
- **Internal Features:**
  - `isMobileSidebarOpen`: Manages mobile drawer state.
  - `isDarkMode`: Toggles dark mode CSS variables.
  - `animate-in`: Motion transition for content entry.

## 2. AuthModals (`src/components/AuthModals.tsx`)
The entry and role selection engine.

- **Purpose:** Handle user login, registration, and role simulation.
- **Logic:**
  - Uses `isRegister` to toggle views.
  - Uses `selectedRole` to determine the target route upon "Login".
  - Simulates a 1500ms server delay with a "Success" state.
- **Redirection Matrix:**
  - `doctor` -> `/doctor/dashboard`
  - `booking_center` -> `/booking/dashboard`
  - `patient` -> `/patient/dashboard`
  - (and others).

## 3. Sidebar (`src/components/ui/Sidebar.tsx`)
The primary dashboard navigation menu.

- **Purpose:** Render role-specific navigation items.
- **Visual Features:**
  - **Active State:** Primary color background with scale effect.
  - **Highlight State:** Sub-primary background for important actions (e.g., "New Booking").
  - **Badge Support:** Displays numeric notifications on nav items (e.g., "Queue: 5").
- **RTL Behavior:** Anchored to the right, icons mirrored where necessary.

## 4. Modal (`src/components/ui/Modal.tsx`)
The base overlay component.

- **Purpose:** Provide a standardized container for all dialogs (Auth, Simulators, Search).
- **Features:**
  - Backdrop blur (`backdrop-blur-sm`).
  - Motion-driven entry (Scale and Fade).
  - Responsive sizing (sm, md, lg, xl, full).
  - RTL-aligned title and close button.

## 5. DocumentScanner (`src/components/shared/DocumentScanner.tsx`)
Specialized clinical utility.

- **Purpose:** Simulate QR code scanning for EHR verification.
- **Implementation:**
  - Uses `react-qr-code` for display (in other components).
  - Scanner UI uses local state to simulate camera input and decoding logic.
  - Maps `MEDI://` strings to `INITIAL_PATIENTS` mock data.

---
**Authority:** [AAFIYA — FRONTEND FREEZE BASELINE](../../AAFIYA_FRONTEND_FREEZE_BASELINE.md)
