# AAFIYA Mobile — Functional Inventory: Category 3
## AAFIYA Patient — الوصفات والتذكيرات والطوارئ

**Category Status:** In Progress  
**Design Direction:** Premium Editorial Medical Aesthetic  
**Policy Compliance:** Health Lockdown 2026-10-29 (Zero edit/save operations for blood group, allergies, or chronic conditions in V1; strictly read-only medical display).

---

### 1. Component & Screen Inventory

#### A. PrescriptionsScreen (`lib/screens/prescriptions_screen.dart`)
- **Type:** Screen (`StatefulWidget`)
- **Key Actions & Interactions:**
  - `AafiyaAppBar` leading Back button ($\ge 48\text{dp}$).
  - Filter chips row (`FilterChip` for `all`, `active`, `completed`, `voided`, `expired`).
  - Pull-to-refresh (`RefreshIndicator`).
  - Pagination scroll controller (`_onScroll`).
  - Item tap navigates to `PrescriptionDetailScreen`.
  - Error state with retry CTA (`AafiyaErrorView`).
  - Empty state (`AafiyaEmptyView`).

#### B. PrescriptionCard (`lib/widgets/prescription_card.dart`)
- **Type:** Widget (`StatelessWidget`)
- **Key Data Fields & Visual Badges:**
  - Prescription reference header with icon.
  - Status chip (`AafiyaStatusChip` mapping: active, completed, voided, expired).
  - Doctor name and clinical specialty.
  - Clinic name.
  - Issue date (`issuedOn`).
  - Medication count indicator badge.

#### C. PrescriptionDetailScreen (`lib/screens/prescription_detail_screen.dart`)
- **Type:** Screen (`StatelessWidget`)
- **Key Sections & Controls:**
  - `AafiyaAppBar` leading Back button ($\ge 48\text{dp}$).
  - Read-only administrative notice card.
  - Overview card (Reference, Status Chip, Doctor, Clinic, Issue Date, Expiry Date).
  - Medications list:
    - Medication name.
    - Substitution allowed / not allowed chip badge.
    - Dosage, frequency, duration metadata.
    - Special instructions callout.
  - Doctor's general clinical notes card.
  - QR Code verification section:
    - Styled QR image container (180dp).
    - Monospace secure token display.
    - Copy verification link button ($\ge 48\text{dp}$, floating feedback).

#### D. EmergencyProfileScreen (`lib/screens/emergency_profile_screen.dart`)
- **Type:** Screen (`StatefulWidget`)
- **Key Sections & Features (Strictly Read-Only V1):**
  - `AafiyaAppBar` leading Back button ($\ge 48\text{dp}$).
  - Share medical record button in AppBar (`PatientShareRecordDialog.show`).
  - Read-only policy notice banner.
  - Hero blood group container (Crimson/error accented, 72dp) and MRN / Patient Full Name.
  - Chronic condition indicator banner (`isChronic` chip) and listed conditions with ICD-10 codes.
  - Allergies list with severity badges (`severe`, `moderate`, `mild`), reaction, notes.
  - Emergency contacts list with primary contact badge and phone launch/feedback CTA.

---

### 2. Baseline Test Suite
- `test/patient_prescription_test.dart` (3 tests passed)
- `test/patient_emergency_profile_test.dart` (13 tests passed)
- Total baseline: **16/16 tests passing (100%)**.

---

### 3. Planned Visual Upgrades (Zero Regression)
1. In `PrescriptionCard`:
   - Replace ad-hoc status container with `AafiyaStatusChip` using token colors (`AafiyaColors.emeraldDark` on `AafiyaColors.emeraldSoft`, etc.).
   - Standardize icon sizes and typography hierarchy.
2. In `PrescriptionDetailScreen`:
   - Standardize status badge to `AafiyaStatusChip`.
   - Ensure BackButton has $\ge 48\text{dp}$ touch target.
   - Upgrade copy verification button height to 52dp.
3. In `EmergencyProfileScreen`:
   - Standardize severity chips with WCAG AA token colors.
   - Ensure AppBar BackButton and share IconButton have $\ge 48\text{dp}$ touch target constraints.
