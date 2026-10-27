---
name: Clinical Clarity & Confident Underwriting
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#404751'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#707882'
  outline-variant: '#bfc7d2'
  surface-tint: '#00639c'
  primary: '#006099'
  on-primary: '#ffffff'
  primary-container: '#007abf'
  on-primary-container: '#fdfcff'
  inverse-primary: '#98cbff'
  secondary: '#895100'
  on-secondary: '#ffffff'
  secondary-container: '#ff9c0d'
  on-secondary-container: '#663b00'
  tertiary: '#006b2c'
  on-tertiary: '#ffffff'
  tertiary-container: '#00873a'
  on-tertiary-container: '#f7fff2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cfe5ff'
  primary-fixed-dim: '#98cbff'
  on-primary-fixed: '#001d33'
  on-primary-fixed-variant: '#004a77'
  secondary-fixed: '#ffdcbc'
  secondary-fixed-dim: '#ffb86c'
  on-secondary-fixed: '#2c1700'
  on-secondary-fixed-variant: '#683c00'
  tertiary-fixed: '#7ffc97'
  tertiary-fixed-dim: '#62df7d'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005320'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-xl:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.005em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  caption:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  section-gap: 2rem
---

## Brand & Style

This design system establishes an enterprise-grade digital quoting and plan administration platform engineered specifically for brokers, underwriters, and SME group decision-makers. The aesthetic balance reflects authority, high compliance rigor, and financial assurance while avoiding bureaucratic weight. The interface communicates speed, surgical clarity, and clinical trust.

### Visual Architecture & Influence
- **Style Category:** Corporate / Modern with functional minimalism and soft institutional elevation.
- **Atmospheric Posture:** Airy surfaces, precise tabular data density, restrained accent moments, and unmistakable state signaling. It eschews decorative glassmorphism or non-standard brutalism in favor of structural grid balance, deliberate whitespace, and calm readability.
- **Bilingual Equilibrium:** Conceived from the core to operate symmetrically across English (LTR) and Arabic (RTL) typographical paradigms, ensuring consistent cognitive rhythm regardless of linguistic context.

## Colors

The palette balances the signature corporate blue with functional alert and transactional state colors. Light mode serves as the singular operational baseline to maintain document, actuarial, and insurance contract legibility.

### Palette Assignment & Tonal Usage

- **Primary (`#0080C9`):** Primary brand authority. Used for high-intent actions, selected tab states, core navigation highlights, and active quotation links.
- **Accent / Secondary (`#FA9800`):** Contextual calls to action, pending review highlights, and intermediate workflow progress bars.
- **Success (`#16A34A`):** Quote approved, policy bound, valid census file uploads, and positive premium variance.
- **Warning (`#D97706`):** Missing member underwriting details, approaching quote expiry, and conditional terms.
- **Error / Danger (`#DC2626`):** Validation failure, network rejection, missing mandatory census data, and underwriting exclusion.
- **Neutral Surface Foundation:**
  - Base canvas background: `#F8FAFC` (Slate-50)
  - Card & Modal surfaces: `#FFFFFF` (Pure white)
  - Nested container low / Table header alternate: `#F1F5F9` (Slate-100)
  - Structural divider lines & input borders: `#E2E8F0` (Slate-200)
- **Text & Contrast Hierarchy:**
  - High-emphasis labels, totals, and headlines: `#0F172A` (Slate-900)
  - Secondary metadata, column descriptors, and helper text: `#64748B` (Slate-500)
  - Subtle disabled indicators: `#94A3B8` (Slate-400)

## Typography

Typography prioritizes high-speed scannability across dense tabular census data, plan tier matrices, and rate sheets. Generous vertical line-height rules eliminate cognitive fatigue in high-volume quoting sessions.

### Multilingual Type Rules
- **English Base:** Inter handles all primary interface elements, tabular data rendering, and quantitative figures with open tracking and proportional numerals.
- **Arabic Pair:** `Noto Sans Arabic` is paired directly for all RTL contexts, maintaining corresponding weight matching (Regular 400 for Body, Medium 500 for Controls, SemiBold 600 for Subheads, Bold 700 for Section Headings).
- **Tabular Figures:** Always enforce `font-variant-numeric: tabular-nums` across monetary columns, member counts, co-pay percentages, and quote revision logs.

## Layout & Spacing

Layouts follow a fluid, responsive 12-column grid anchored inside a maximum container width of 1440px to ensure wide-screen readability on enterprise desk setups.

### Form Factors & Adaptation Rules
- **Desktop (1024px and above):** 12 columns, 24px gutters, 32px canvas margins. Multi-tier quotes (e.g., Bronze, Silver, Gold, Platinum) sit side-by-side in balanced columns.
- **Tablet (768px - 1023px):** 8 columns, 20px gutters, 24px canvas margins. Plan cards shift into two-by-two grids with sticky lateral summary trays.
- **Mobile (Below 768px):** 4 columns, 16px gutters, 16px canvas margins. Benefit comparison tables transform into swipeable accordions, and all critical quotation commands bind to the sticky viewport base.

### Section Spacing Paradigm
Operational sections (Company Info, Plan Selection, Census Upload, Underwriting Add-ons) are separated by a rigid 24px to 32px vertical rhythm (`space-lg` to `space-xl`). Inner component clusters group tightly using 8px (`space-sm`) and 16px (`space-md`) intervals.

## Elevation & Depth

Visual hierarchy uses flat structural containment backed by soft atmospheric shadows. High-depth dramatization is avoided to maintain enterprise precision.

### Elevation Levels
- **Layer 0 (Canvas):** Flat `#F8FAFC`, non-elevated ground plane.
- **Layer 1 (Card & Section Containers):** Solid `#FFFFFF`, bordered by a subtle 1px stroke of `#E2E8F0`, elevated with `0 1px 3px 0 rgba(0, 0, 0, 0.05)`.
- **Layer 2 (Dropdowns, Flyouts & Tooltips):** Solid `#FFFFFF`, stroke `#E2E8F0`, elevated with `0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)`.
- **Layer 3 (Modals & Drawer Panels):** Elevated with `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)`, flanked by an ink backdrop overlay (`rgba(15, 23, 42, 0.45)`).
- **Layer 4 (Sticky Workflow Bar):** Positioned fixed at the bottom viewport edge, utilizing a reverse top shadow: `0 -4px 12px 0 rgba(15, 23, 42, 0.06)`, bounded by a 1px top border `#E2E8F0`.

## Shapes

The design system standardizes on a balanced curved language with base curvature set to 8px (`rounded-md`), expanding to 10px–12px (`rounded-lg` / `rounded-xl`) across core structural components.

### Element Rounding Mapping
- **Buttons, Form Inputs, & Select Triggers:** 8px to 10px radius for crisp interaction affordances.
- **Plan Cards, Data Panels, & Modal Dialogue Windows:** 12px radius (`rounded-xl`) to soften dense screen segments.
- **Status Pills, Language Switches, & Notification Counts:** Full pill geometry (`9999px`) to maintain clear differentiation between interactive inputs and non-interactive status badges.

## Components

### Header Shell
- **Structure:** Standardized 68px height fixed-top navigation container. Left zone anchors the brand logotype paired with an SME platform descriptor. The center hosts main navigational pathways (Dashboard, New Quote, Pipeline, Renewal Book).
- **Utility Cluster (Right Zone):** Houses an inline language switch (`EN` | `عربي`) in a bordered pill shell, a subtle bell icon with red active-dot notification badge, and a broker identity chip (avatar initials, broker name, brokerage entity pill).

### Status Pills
Status indicators are styled as compact badges (12px typography, 6px horizontal padding, 2px vertical, pill-shaped) paired with a 6px status circle:
- **Draft:** Background `#F1F5F9`, Text `#475569`, Dot `#94A3B8`.
- **In Review:** Background `#FEF3C7`, Text `#B45309`, Dot `#D97706`.
- **Ready:** Background `#E0F2FE`, Text `#0369A1`, Dot `#0080C9`.
- **Won / Approved:** Background `#DCFCE7`, Text `#15803D`, Dot `#16A34A`.
- **Expired / Declined:** Background `#FEE2E2`, Text `#B91C1C`, Dot `#DC2626`.

### Buttons
- **Primary:** Solid `#0080C9` fill, `#FFFFFF` text, 10px radius, medium weight. Active state deepens to `#006CA8`. Focus shows an outward offset ring of 2px (`#0080C9` at 30% opacity).
- **Secondary:** Surface `#FFFFFF`, border 1px `#E2E8F0`, text `#0F172A`. Hover transitions background to `#F8FAFC`.
- **Destructive:** Surface `#FEE2E2`, text `#DC2626`, hover background `#FCDAD7`.

### Input Fields & Controls
- **Inputs:** 40px height, `#FFFFFF` background, 1px `#E2E8F0` border, 8px radius. Active focus applies a direct `#0080C9` outline.
- **Checkboxes & Radios:** 18px boundary, 4px radius for checkboxes, full circle for radios. Checked state fills `#0080C9` with sharp white glyphs.

### Plan Comparison Cards
- Modular 12px rounded cards. The selected card gains an intentional 2px border in `#0080C9` and a top badge designating current broker preference. Card interior clearly differentiates monthly versus annual premium aggregates, direct deductibles, and network classification.

### Sticky Workflow Action Bar
- A full-width anchored strip at the base of long configuration flows. 
- Displays key live tallies on the left (Group Size, Plan Class, Total Estimated Annual Premium in AED).
- Displays progressive actions on the right (Save Draft, Generate Quote PDF, Proceed to Underwriting Binding).