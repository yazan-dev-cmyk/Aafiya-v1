# AAFIYA — Policy Compliance & Governance Audit
**Revision Round 2 — Health Lockdown, QR Protocol, Financial Ledger & Schedule Policy**

## 1. Health Lockdown Policy Compliance (Dated: 2026-10-29)

### A. Mandate Summary
Under the ratified AAFIYA Health Lockdown policy (effective 2026-10-29), the following health data features are **STRICTLY CLOSED / LOCKED in V1**:
1. **Shared Medical Records (`/shared-records/*`)**:
   - Access to shared health files, encrypted external records, and third-party doctor sharing routes is completely disabled.
   - Encrypted backup is exclusively restricted to Super Admin infrastructure.
2. **Allergy Registry**:
   - Patient allergy recording, display, and clinical ingestion are administratively locked.
3. **Chronic Conditions Registry**:
   - Patient chronic illness tracking, ICD-10 mapping, and clinical indicator display are administratively locked.
4. **Registered Medications Function**:
   - Chronic medication tracking outside direct e-prescriptions is locked.

### B. Corrective Actions Applied to Visual Designs
In Revision Round 1, previews contained illustrative mockups of allergies and chronic conditions. These have been corrected in accordance with the lockdown policy:
- **`emergency_profile_screen.dart` (Patient)**:
  - **Correction**: The allergies and chronic illnesses sections are explicitly rendered with the administrative lock state (`AafiyaLockedAction` / `AAFIYA-MOBILE-UI-FEATURE-LOCK-01`) displaying the official notice:
    > «هذه الميزة مغلقة حاليًا لأسباب إدارية وتنظيمية.»
  - The "Share Medical Record" (`patient_share_record_dialog.dart`) action button has been removed from the navigation bar.
- **`patient_summary_sheet.dart` (Pro)**:
  - **Correction**: The sheet no longer presents allergy and chronic condition cards as active clinical data. Where invoked, it displays only whitelisted demographic metadata (Patient Name, MRN, Emergency Phone) with an explicit administrative lockdown notice regarding clinical records.
- **`patient_home_shell.dart` (Records Tab)**:
  - **Correction**: The third navigation tab is marked as `NEEDS CONFIRMATION / FEATURE LOCKED`. In the UI, accessing it displays the standard V1 policy lockdown barrier.

---

## 2. Medical QR Protocol Compliance (`AAFIYA-APPT:`)

### A. Mandate Summary
The QR admission protocol for AAFIYA is hardcoded and contractually bound to the prefix:
```
AAFIYA-APPT:<64-character-alphanumeric-ASCII-token>
```
### B. Visual Design Boundaries:
1. **Zero Protocol Mutation**: No new format, URI scheme, or altered delimiters have been proposed or introduced.
2. **Visual Ticket Pass Only**: Design improvements in `visit_pass_sheet.dart` and `appointment_detail_screen.dart` focus strictly on the visual container (boarding pass aesthetic, micro-perforations, contrast optimization).
3. **Scanner Integrity**: The scanner viewfinder in `qr_scanner_sheet.dart` maintains the exact same parsing and check-in flow (`check_in_sheet.dart`).
4. **Non-Functional Mock QR**: All preview images feature a stylized dummy QR code clearly designated as:
   `نموذج تجريبي غير مخصص للمسح السريري` to prevent accidental clinical scanning.

---

## 3. Assistant Financial Rewards Ledger Compliance

### A. Policy Alignment with Batch 6 Migrations
The rewards system is governed by the newly migrated financial ledger:
- `assistant_reward_balances` & `assistant_reward_transactions` (Double-entry accounting).
- `assistant_reward_rate_schedules` (Forward-looking dynamic rate schedules set by Central Administration).
- `assistant_payout_batches` & `assistant_payout_batch_items` (FIFO allocation with unabsorbed debt roll-over).

### B. Visual Design Corrections:
1. **Dynamic Amounts**: Removed static claims of a hardcoded "50,000 DZD" threshold or fixed "250 DZD" per-appointment rates.
2. **Explicit Sample Markings**: All monetary values in `pro_rewards_proposed.jpg` are designated with `(قيمة توضيحية تجريبية)`.
3. **Indivisible Unit of Reward**: The ledger cards illustrate integer transaction counts with zero fractional splitting.
4. **Debt Carry-Over Indicator**: The UI includes a dedicated slot for net debt roll-over (`unabsorbed_debt`) when a payout item bounces.

---

## 4. Doctor Consultation Working Hours & Permanent Irreversible Lock

### A. Policy Mandate (AAFIYA V1 Policy)
Under the verified V1 specification:
- Consultation schedule activation is **permanently irreversible**.
- Once a doctor activates their weekly schedule and begins accepting patient appointments, the schedule cannot be edited or deleted through the mobile application.

### B. Visual Design Corrections:
1. **Pre-Action Warning Card**: Rendered prominently in Amber/Gold with a shield lock icon:
   > «تنبيه سياسة AAFIYA V1: بمجرد تفعيل الجدول والبدء في استقبال الحجوزات، يتم قفل أوقات العمل بصورة نهائية غير قابلة للتعديل للحفاظ على حقوق المرضى المجدولين.»
2. **Distinct Action Hierarchy**: The activation CTA button is styled with a distinct security border and lock icon (`تفعيل الجدول والقفل النهائي`), making it visually distinct from ordinary draft-saving buttons.
3. **No False Reversibility**: The UI contains zero toggles or controls implying that an active locked schedule can be "unlocked" or reverted.
