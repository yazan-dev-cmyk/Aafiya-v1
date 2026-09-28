# MediServices Final Manual Checklist

## 1. Landing & Discovery
- [ ] Header logo redirects to main platform.
- [ ] Search functionality opens and filters correctly.
- [ ] "Spec Viewer" (Sparkles icon) opens the 30-chapter overlay.
- [ ] "Simulator" (Zap icon) opens the Business Rules Simulator.

## 2. Authentication (8 Primary Roles)
- [ ] Patient Login/Register.
- [ ] Doctor Login/Register.
- [ ] Booking Center Login/Register.
- [ ] Laboratory Login (Direct only).
- [ ] Radiology Login (Direct only).
- [ ] Admin Login (Direct only).

## 3. Dashboards (Functional Verification)
- [ ] **Doctor Dashboard:**
    - [ ] Waiting Room queue displays patients.
    - [ ] Start Consultation switches to active patient view.
    - [ ] Prescription and Lab/Rad tabs are accessible.
    - [ ] Theme Toggle (Light/Dark) works instantly.
- [ ] **Booking Center Dashboard:**
    - [ ] "New Booking" wizard allows patient selection (Registered vs Guest).
    - [ ] Quota badge updates correctly.
    - [ ] "Privacy Wall" notification is visible.
- [ ] **Admin Dashboard:**
    - [ ] KPI stats reflect mock/real data.
    - [ ] "Users" list supports role filtering.
    - [ ] "Assistant RBAC" section is accessible.

## 4. Assistant Specifics (3 Roles)
- [ ] **Doctor Assistant:** Can manage queue but not clinical EHR summary.
- [ ] **Lab Assistant:** Can upload results but not view billing.
- [ ] **Radiology Assistant:** Can manage studies but not center settings.

## 5. UI/UX & Responsive
- [ ] 44px minimum touch targets on mobile view.
- [ ] No "AI Slop" patterns (Nested cards, purple/blue gradients).
- [ ] Arabic Right-to-Left (RTL) alignment is consistent everywhere.
- [ ] Mathematical spacing (16px minimum container padding).

## 6. Business Rules
- [ ] Verify: Confirmed Booking = -1 Credit.
- [ ] Verify: Rejected Booking = 0 Credit.
- [ ] Verify: Guest Patient = Printable ticket only.
- [ ] Verify: Registered Patient = UUID record in EHR.
