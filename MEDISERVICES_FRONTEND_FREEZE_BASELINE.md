# AAFIYA — FRONTEND FREEZE BASELINE

## 1. Freeze Authority
This document is the authoritative Frontend Freeze Baseline for Aafiya.

During the Freeze period, the repository state, route structure, component architecture, visual language, typography, mock-data contracts, and frontend behavior described and verified in this document shall be treated as the official baseline.

AI agents, developers, and automated tools MUST NOT redesign, refactor, rename, relocate, remove, or replace existing frontend structures unless explicitly authorized by a new approved change request.

## 2. Freeze Prohibitions (ممنوعات الـ Freeze)
The following actions are strictly prohibited unless explicitly authorized by a formal, independent change request:
- **No visual redesign.**
- **No route changes.**
- **No component deletion.**
- **No component renaming.**
- **No folder restructuring.**
- **No dependency replacement.**
- **No typography replacement.**
- **No design-system changes.**
- **No mock-data restructuring.**
- **No business-rule changes.**
- **No API implementation.**
- **No Laravel integration.**
- **No authentication migration.**
- **No RBAC redesign.**

## 3. Documentation-Only Rule
During the Documentation Phase, all AI operations shall be **Read-Only** with respect to application behavior and architecture.
- The AI may inspect, analyze, map, describe, document, and cross-reference the existing implementation.
- The AI MUST NOT modify production frontend code as part of documentation generation.

## 4. Source-of-Truth Hierarchy
The following hierarchy must be followed for all architectural and functional documentation:
1. **Actual Repository / Source Code** (The final authority)
2. **Successful Build Output** (Verified functional state)
3. **Route Structure** (Actual App Router configuration)
4. **Current Data / Types / Components** (Existing code artifacts)
5. **Existing Project Documentation** (P1-P10, Knowledge Base)
6. **Previous AI-generated assumptions** (Lowest priority)

## 5. Documentation Accuracy Rule
- Documentation MUST describe the implementation that **actually exists** in the repository.
- A feature shall NOT be documented as implemented merely because it exists in a specification, roadmap, comment, mock, or previous documentation.
- Each documented feature MUST be traceable to an actual route, component, type, data source, or implementation artifact.

## 6. Freeze Verification Checklist
- [x] **Build passes**: Confirmed via `npm run build`.
- [x] **TypeScript passes**: Type safety validated.
- [x] **Routes verified**: 11 core roles and landing pages mapped.
- [x] **No Spec Viewer artifacts remain**: All spec-only files removed.
- [x] **No obsolete navigation links remain**: Sidebar and Header links verified.
- [x] **No orphan imports remain**: Linter check performed.
- [x] **No broken references remain**: Link consistency verified.
- [x] **Design system remains intact**: Tailwind v4 architecture preserved.
- [x] **Mock data remains available**: `src/data/` stabilized.
- [x] **No unintended files changed**: Audit complete.
- [x] **Git/repository baseline recorded**: Current state locked.

## 7. Change Control
Any change discovered to be necessary after the Freeze MUST be classified as one of:
- **CRITICAL**: Build/security/blocking issues that prevent application startup.
- **CORRECTION**: Factual discrepancies between the repository and the freeze report.
- **AUTHORIZED CHANGE**: Explicitly requested modifications by the user.

No other change is permitted during Freeze.

## 8. Typography Baseline (Design Decision)
- **Arabic UI**: **Amiri** (Standard for all Arabic text)
- **Foreign-language UI / Brand accents**: **Satisfy** (Logos, Taglines, Latin technical labels)
- **System fallback**: ui-sans-serif, system-ui.
- *Rule: No automatic replacement of these fonts during documentation or optimization.*

## 9. Dependency Baseline (Verified from package.json)
- **Next.js**: `15.1.0`
- **React**: `19.0.0`
- **Tailwind CSS**: `^4.0.0`
- **Lucide React**: `0.454.0`
- **Motion**: `^11.11.17`
- **React QR Code**: `^2.2.0`

## 10. Route Baseline
| Route | Page File | Role | Type | Access |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `src/app/page.tsx` | Public | Landing | Public |
| `/patient/dashboard` | `src/app/patient/dashboard/page.tsx` | Patient | Dashboard | Protected |
| `/doctor/dashboard` | `src/app/doctor/dashboard/page.tsx` | Doctor | Dashboard | Protected |
| `/assistant/dashboard` | `src/app/assistant/dashboard/page.tsx` | Doctor Assistant | Dashboard | Protected |
| `/booking/dashboard` | `src/app/booking/dashboard/page.tsx` | Booking Center | Dashboard | Protected |
| `/laboratory/dashboard` | `src/app/laboratory/dashboard/page.tsx` | Lab Manager | Dashboard | Protected |
| `/laboratory/assistant-dashboard` | `src/app/laboratory/assistant-dashboard/page.tsx` | Lab Assistant | Dashboard | Protected |
| `/radiology/dashboard` | `src/app/radiology/dashboard/page.tsx` | Radiology Manager | Dashboard | Protected |
| `/radiology/assistant-dashboard` | `src/app/radiology/assistant-dashboard/page.tsx` | Radiology Assistant | Dashboard | Protected |
| `/admin/dashboard` | `src/app/admin/dashboard/page.tsx` | Platform Admin | Dashboard | Protected |
| `/admin/assistant-dashboard` | `src/app/admin/assistant-dashboard/page.tsx` | Admin Assistant | Dashboard | Protected |

## 11. Final Freeze Decision
**FROZEN — READY FOR DOCUMENTATION**
