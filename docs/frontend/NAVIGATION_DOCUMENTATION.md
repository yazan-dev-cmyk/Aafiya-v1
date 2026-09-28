# NAVIGATION DOCUMENTATION — AAFIYA

## 1. Overview
Aafiya features a hierarchical navigation system tailored to the user's role and context. The navigation is divided into **Global Navigation** (Landing Page) and **Dashboard Navigation** (Role-specific).

## 2. Global Navigation (Header)
Located in `src/components/Header.tsx` and `src/components/TopBar.tsx`.

### 2.1 TopBar Components
- **Aafiya V1.0 Badge:** Versioning display.
- **Role Selector:** Quick access simulation for all 11 roles (only in simulation mode).
- **Search:** Global search trigger.

### 2.2 Main Header Components
- **Logo:** Branding with `Amiri` and `Satisfy` typography.
- **Nav Links:** (Landing Page sections)
  - المزايا (`#features`)
  - لماذا نحن (`#why-us`)
  - من نحن (`#about`)
  - الأسئلة الشائعة (`#faq`)
- **Action Button:** "انضم الآن" (Triggers `AuthModals.tsx`).

## 3. Dashboard Navigation (Sidebar)
Located in `src/components/ui/Sidebar.tsx` and integrated via `DashboardLayout.tsx`.

### 3.1 Sidebar Structure
- **Logo/Title:** Role-specific branding (e.g., "لوحة تحكم الطبيب").
- **Nav Items:** Array of objects containing `id`, `label`, `icon`, and optional `badge`.
- **Active State:** Highlights the current tab via `activeId`.
- **Mobile Behavior:** Overlay drawer with backdrop.

### 3.2 Role-Specific Navigation Examples
- **Doctor:** Queue, Patients, E-Prescriptions, Diagnostics, Schedule, Notifications.
- **Booking Center:** Dashboard, New Booking, Patients Directory, Packages, Staff, Settings.
- **Patient:** Overview, Medical Record, History, Profile.

## 4. Navigation Logic
- **Routing:** Handled via Next.js `Link` and `useRouter` for cross-page navigation.
- **Tab Switching:** Dashboards use internal state (`activeTab`) to switch views without changing the URL, ensuring a fast, single-page experience within each role's dashboard.
- **Role Redirection:** Managed in `AuthModals.tsx` via `window.location.href` to ensure full layout reload for role context switching.

## 5. Mobile Navigation
- **Header:** Hamburger menu for landing sections.
- **Dashboard:** Drawer-based sidebar triggered by a toggle button in the `DashboardLayout` header.

## 6. Audit Observations
- **Dead Links:** Some footer links (e.g., "الخصوصية", "الشروط") are currently static `#` links.
- **Consistency:** All icons are unified via `lucide-react`.

---
**Authority:** [AAFIYA — FRONTEND FREEZE BASELINE](../../AAFIYA_FRONTEND_FREEZE_BASELINE.md)
