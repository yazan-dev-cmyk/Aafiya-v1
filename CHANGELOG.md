# CHANGELOG — AAFIYA I18N MIGRATION

## [0.2.0] - 2026-08-14
### Added
- Professional I18n infrastructure using `next-intl`.
- Arabic (ar) and English (en) support.
- Localized routing via `/[locale]` path.
- Typography system for bilingual support (Amiri for Arabic, Inter for English).
- `messages/ar.json` and `messages/en.json` translation files.
- `I18N_IMPLEMENTATION_REPORT.md` and `I18N_INVENTORY.md`.

### Changed
- Refactored `src/app` into `src/app/[locale]` directory structure.
- Refactored `src/app/[locale]/layout.tsx` to support dynamic locales and fonts.
- Refactored `src/App.tsx` to remove local language state and use `next-intl` hooks.
- Refactored `Header.tsx`, `Hero.tsx`, `StatsSection.tsx`, and `FeaturesSection.tsx` to use translation keys.
- Switched to CSS logical properties (`ms-`, `me-`, `start-`, `end-`) for better directionality support.

### Fixed
- Navigation dropdown positioning issues in RTL vs LTR.
- Icon orientation for directional arrows in English locale.
- Duplicate syntax issues during component refactoring.

## [0.1.0] - 2026-08-14
### Initial
- Project baseline "Frontend Freeze" mapped and analyzed.
- Discovery of all hardcoded Arabic strings.
