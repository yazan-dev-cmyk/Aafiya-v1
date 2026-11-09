# AAFIYA Pro — Functional Inventory: Category 5
## Authentication & Shared UI (تسجيل الدخول والواجهات المشتركة)

**Status:** In Progress / Verified Baseline  
**Design Aesthetic:** Premium Editorial Medical Aesthetic (Approved Round 2)  
**Strict Policy:** Login-only professional portal (Zero public/self-registration, zero signup forms).

---

### 1. Scope & Screen Inventory

#### A. ProSplashShell (`mobile/apps/aafiya_pro/lib/shells/splash_shell.dart`)
- **Type:** State Foundation (`StatefulWidget`)
- **Key Functions:**
  - Token restoration check (`sessionManager.restoreSession()`).
  - Automatic routing: `onAuthenticated` (routes to `RoleResolutionShell`) or `onUnauthenticated` (routes to `ProAuthShell`).
  - Trilingual language switch segment control (`SegmentedButton` for Arabic, French, English).
  - High-resolution brand logo presentation (`assets/branding/Aafiya_Logo_Full.png`).
- **Touch Targets:**
  - `SegmentedButton` with `VisualDensity.standard` and `MaterialTapTargetSize.padded` ($\ge 48\text{dp}$).

#### B. ProAuthShell (`mobile/apps/aafiya_pro/lib/shells/auth_shell.dart`)
- **Type:** Screen / Authentication Shell (`StatefulWidget`)
- **Key Functions & Zero-Regression Constraints:**
  - Pure login interface: `email` and `password`.
  - Zero signup/register UI: No creation buttons, tabs, or links (strict professional policy).
  - Password visibility toggle (`IconButton` with 48dp constraints).
  - Forgot password modal bottom sheet trigger (`AafiyaForgotPasswordSheet.show`).
  - Top `AafiyaAppBar` with brand title and language menu (`PopupMenuButton<Locale>`).
  - Primary CTA button: `AafiyaButton(height: 52.0)` with loading state.
  - Error banner display upon invalid credentials or network failure.
  - Session provisioning upon success: `sessionManager.setAuthenticatedUser(token, user)` and `onLoginSuccess()`.

#### C. RoleResolutionShell (`mobile/apps/aafiya_pro/lib/shells/role_resolution_shell.dart`)
- **Type:** Shell Dispatcher (`StatelessWidget`)
- **Role Destination Matrix:**
  - `doctor` $\rightarrow$ `DoctorShell` (Queue, Agenda, Working Hours, Onboarding)
  - `doctor_assistant` / `assistant` $\rightarrow$ `AssistantShell` (Queue, Booking, Rewards, Staff parity)
  - `booking_center` $\rightarrow$ `BookingCenterShell` (Quota balance, Appointments, Escalations, Zero staff UI)
  - `admin`, `laboratory`, `radiology` (Web-only) $\rightarrow$ Informational banner directing to web console + Sign out.
  - `patient` or `unauthorized` $\rightarrow$ Access denied guidance + Sign out.

---

### 2. Baseline Test Suite Results
- `test/pro_auth_shell_test.dart`
- `test/pro_language_switching_test.dart`
- `test/pro_app_test.dart`
- **Result:** **25/25 tests passing (100% success)**.

---

### 3. Visual & Usability Upgrades
1. **`ProSplashShell`**:
   - Upgraded `SegmentedButton` to `VisualDensity.standard` and `MaterialTapTargetSize.padded` ($\ge 48\times 48\text{dp}$).
2. **`ProAuthShell`**:
   - Primary `AafiyaButton` set to `height: 52.0`.
   - Obscure password `IconButton` enhanced with `BoxConstraints(minWidth: 48, minHeight: 48)`.
   - Card border styling and responsive max-width layout (400dp) with `IBM Plex Sans Arabic` / `Plus Jakarta Sans`.
3. **`RoleResolutionShell`**:
   - AppBar icon buttons given minimum $48\times 48\text{dp}$ touch target constraints.
