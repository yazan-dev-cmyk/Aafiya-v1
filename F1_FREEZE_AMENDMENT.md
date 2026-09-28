# AAFIYA — F1 FRONTEND FREEZE AMENDMENT

## 1. REASON FOR AMENDMENT
This amendment is required to implement the French localization architectural foundation (Phase 1). The previous freeze baseline did not fully account for the architectural changes needed for a robust 3-locale (AR, EN, FR) system, specifically regarding data normalization and routing.

## 2. AFFECTED ARCHITECTURE
- **Routing**: Middleware updated to support `/fr/` prefix.
- **I18n**: metadata moved from static objects to localized JSON keys via `next-intl`.
- **Data Layer**: Mock data normalized to canonical English keys (e.g., `male`, `active`) to decouple business logic from Arabic strings.
- **UI Logic**: Filtering and display logic updated to handle normalized canonical values.
- **RTL/LTR**: Transitioning from physical classes (`left-`, `right-`) to logical properties (`start-`, `end-`, `ps-`, `pe-`).

## 3. ALLOWED MODIFICATIONS
- `src/middleware.ts`: Routing matcher updates.
- `src/app/[locale]/layout.tsx`: Metadata architecture refactor.
- `messages/*.json`: Metadata keys and translation foundation.
- `src/data/*.ts`: Domain data normalization (Arabic -> Canonical Keys).
- `src/components/**/*.tsx`: Logical property refactoring and normalization logic updates.

## 4. PROHIBITED CHANGES
- Broad UI redesign or visual style changes unrelated to i18n.
- Removal of Laravel integration logic.
- Introduction of new non-essential features.
- Modification of core business rules unrelated to localization.

## 5. VALIDATION STATUS
- [x] Routing (AR/EN/FR)
- [x] Metadata Localization
- [x] Domain Data Normalization (Initial)
- [x] Logical Properties (Initial)
