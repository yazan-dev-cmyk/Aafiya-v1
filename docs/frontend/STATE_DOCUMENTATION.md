# STATE & INTERACTION DOCUMENTATION — AAFIYA

## 1. Overview
Aafiya primarily utilizes localized React state (`useState`) to manage dashboard interactivity and role simulation. There is no global state management library (like Redux or Zustand) currently implemented, as the application is designed to be highly modular and simulation-heavy.

## 2. Global UI State
- **Authentication & Role:** Managed in `AuthModals.tsx`.
  - `selectedRole`: Tracks the user-selected role during simulation.
  - `isRegister`: Toggles between login and registration views.
  - `submitted`: Handles the transition between form submission and redirect.
- **Modals:** Most global triggers (Search, Auth, Simulator) use boolean `isOpen` props passed down from parent components (usually `Header` or `DashboardLayout`).

## 3. Dashboard State Patterns
Every dashboard in `src/app/[role]/dashboard/page.tsx` follows a consistent state pattern:

### 3.1 Tab Management
```typescript
const [activeTab, setActiveTab] = useState('overview');
```
Used to conditionally render sub-modules within the same dashboard shell.

### 3.2 Data Simulation
- Dashboard components initialize local state using imported mock data (e.g., `INITIAL_WAITING_QUEUE`).
- Actions (like "Add Patient" or "Approve Booking") update this local state, providing an immediate visual feedback loop.

## 4. Specific Interaction Engines

### 4.1 Booking Simulator (`BookingSimulatorModal.tsx`)
- **State:** Tracks wizard steps (Step 1: Patient Search, Step 2: Details, Step 3: Confirmation).
- **Logic:** Simulates institutional quota deduction and Algeria-specific booking rules.

### 4.2 Document Scanner (`DocumentScanner.tsx`)
- **State:** `isScanning`, `scanResult`, and `error`.
- **Logic:** Simulates the decoding of `MEDI://` protocol strings into readable patient/document data.

### 4.3 Sidebar Toggle
- **State:** `isMobileSidebarOpen`.
- **Location:** Managed in `DashboardLayout.tsx` and passed to `Sidebar.tsx`.

## 5. Persistence
- **Current Status:** **None.**
- **Behavior:** All state transitions (tab changes, simulated bookings, ad updates) are lost upon page refresh.
- **Future Requirement:** P11 will replace this local state with server-side persistence (Laravel API).

---
**Authority:** [AAFIYA — FRONTEND FREEZE BASELINE](../../AAFIYA_FRONTEND_FREEZE_BASELINE.md)
