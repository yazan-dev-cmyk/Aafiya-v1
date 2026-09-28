# TYPOGRAPHY DOCUMENTATION — AAFIYA

## 1. Font Strategy
Aafiya employs a dual-font pairing strategy to maintain cultural authenticity for Arabic users while providing a distinct "Enterprise" brand feel for technical and Latin labels.

## 2. Core Fonts

### 2.1 Amiri (Arabic UI)
- **Role:** Primary typeface for all Arabic text, content, and system labels.
- **Loading:** `next/font/google`.
- **Weights:** `400` (Regular), `700` (Bold).
- **Implementation:** Set as the default `--font-sans` stack.

### 2.2 Satisfy (Brand & Latin Accents)
- **Role:** Display font for branding, "Aafiya" logo accents, English slogans, and technical labels (e.g., version numbers).
- **Loading:** `next/font/google`.
- **Weights:** `400`.
- **Implementation:** Accessible via `@utility font-satisfy`.

## 3. Font Hierarchy

| Level | Size | Weight | Font | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **H1** | `text-4xl`+ | `black` | Amiri | Landing Hero headings. |
| **H2** | `text-2xl` / `3xl` | `bold` | Amiri | Dashboard section titles. |
| **Body** | `text-base` | `normal` | Amiri | General content and forms. |
| **Caption** | `text-xs` | `bold` | Amiri | Metadata and labels. |
| **Brand** | Variable | `normal` | Satisfy | Logo "Services", English tags. |

## 4. CSS Implementation (`src/index.css`)
```css
@theme {
  --font-amiri: var(--font-amiri);
  --font-satisfy: var(--font-satisfy);
  --font-sans: var(--font-amiri), ui-sans-serif, system-ui, ...;
}

@utility font-satisfy {
  font-family: var(--font-satisfy);
}
```

## 5. Usage Examples
- **Arabic Text:** `<p>مرحباً بك في منصة Aafiya</p>` (Uses Amiri by default).
- **Brand Accent:** `<span className="font-satisfy">Aafiya</span>`.
- **Technical Tag:** `<Badge className="font-satisfy">v1.2</Badge>`.

---
**Authority:** [AAFIYA — FRONTEND FREEZE BASELINE](../../AAFIYA_FRONTEND_FREEZE_BASELINE.md)
