# AAFIYA Pro — Functional Inventory: Category 8
## Rewards, Working Hours & Quota (المكافآت، ساعات العمل، وحصص الحجز)

**Status:** In Progress / Verified  
**Design Aesthetic:** Premium Editorial Medical Aesthetic  
**Policy Compliance:** Permanent Irreversible Schedule Lock, Double-entry rewards ledger, Transparent booking center quota accounting.

---

### 1. Scope & Component Inventory

#### A. AssistantRewardsScreen (`mobile/apps/aafiya_pro/lib/screens/assistant_rewards_screen.dart`)
- **Type:** Screen (`StatefulWidget`)
- **Ledger Cards:**
  - Available Reward Balance (DZD).
  - Total Earned to Date.
  - Pending Payout Batch.
  - Next Payout Cycle Date.
- **Payouts History & Debt Indicator:**
  - Payout batch listing with transaction count, status chips, and unabsorbed debt carry-over slot.
  - Zero static or hardcoded reward thresholds (dynamic rate schedules from Central Admin).

#### B. DoctorWorkingHoursScreen (`mobile/apps/aafiya_pro/lib/screens/doctor_working_hours_screen.dart`)
- **Type:** Screen (`StatefulWidget`)
- **Weekly Schedule Editor:**
  - 7 weekdays (Saturday to Friday) with active toggle, start time, end time, and break interval.
- **Permanent Irreversible Lock Security (AAFIYA V1 Policy):**
  - Prominent Amber/Gold warning card with shield lock icon:
    > «تنبيه سياسة AAFIYA V1: بمجرد تفعيل الجدول والبدء في استقبال الحجوزات، يتم قفل أوقات العمل بصورة نهائية غير قابلة للتعديل للحفاظ على حقوق المرضى المجدولين.»
  - Save Draft button (`OutlinedButton` 52dp) vs Activate CTA (`ElevatedButton` 52dp with distinct lock icon).
  - `ScheduleActivationDialog`: Mandatory confirmation checkbox required before final irrevocable activation.

#### C. BcQuotaScreen & QuotaBalanceCard (`mobile/apps/aafiya_pro/lib/screens/bc_quota_screen.dart`)
- **Type:** Screen & Card Component
- **Authoritative Balance:** Authoritative quota display, active packages list, purchase requests history.
- **Zero Local Mutation:** Purchase requests send POST and refresh from server without client tampering.
- **DISC-04 Scope Enforcement:** Zero staff management UI in Booking Center role.

---

### 2. Test Verification Suite
- `test/assistant_rewards_screen_test.dart`
- `test/doctor_working_hours_test.dart`
- `test/bc_quota_test.dart`
- **Result:** **35/35 tests passing (100% success)**.
