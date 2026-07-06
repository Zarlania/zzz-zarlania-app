---
id: '000002'
title: Responsive and layout conventions
description: How to use the mobile-first breakpoint scale, the respond-to and container
  Sass mixins, the fluid design tokens, and the mobile-nav accessibility contract
  established by ADR-0012
tags:
- frontend
- styling
created: '2026-07-05'
updated: '2026-07-05'
related: []
---
# Responsive and layout conventions

<!-- ref-meta:start -->
| Field | Value |
| --- | --- |
| ID | 000002 |
| Title | Responsive and layout conventions |
| Description | How to use the mobile-first breakpoint scale, the respond-to and container Sass mixins, the fluid design tokens, and the mobile-nav accessibility contract established by ADR-0012 |
| Tags | frontend, styling |
| Created | 2026-07-05 |
| Updated | 2026-07-05 |
| Related | — |
<!-- ref-meta:end -->

## Overview

The app's responsive layout follows ADR-0012: a mobile-first foundation combining fluid,
`clamp()`-based type/spacing/container tokens with a small named breakpoint scale for the
handful of real structural shifts. This doc explains the rules for using both, plus the
mobile navigation pattern and its accessibility contract.

## Scope

Covers how to build responsive layout in this app: the breakpoint scale and mobile-first
rule, the `respond-to` and `container` Sass mixins, the fluid design-token catalog and when
to reach for it versus the fixed spacing scale, the mobile-nav pattern and its a11y contract,
and how responsive styling is verified. It does not restate the mixins' or components' exact
code signatures — see the source in `src/styles/` and the app shell for that — and it does
not cover theming (color tokens, light/dark switching), which is ADR-0009 and its own
concern.

## Rules / constraints

- **Mobile-first, `min-width`-based breakpoints.** The named breakpoint scale is `sm`
  (`30rem` / 480px), `md` (`48rem` / 768px), `lg` (`64rem` / 1024px). Write base styles for
  the smallest viewport first, then layer on rules for wider viewports — never the reverse
  (no `max-width` breakpoint queries for the primary layout).
- **Breakpoints are for structural shifts only** — changes in layout shape (e.g. a nav
  collapsing to a hamburger, a column count changing), not for scaling type or spacing. Type
  and spacing use the fluid tokens below instead, so they change continuously with viewport
  width rather than jumping at a threshold.
- **Use the shared partials, not hand-rolled media queries or repeated `max-width`.** Any
  component SCSS can `@use 'breakpoints' as bp;` and wrap a rule in `bp.respond-to(<name>)`
  to gate it behind a breakpoint, and `@use 'layout' as layout;` and include `layout.container`
  to get the standard centered, max-width, fluid-padded column — instead of repeating
  `max-width` + manual centering per component. These partials resolve without relative paths
  because `src/styles` is a configured Sass include path for the app.
- **Fluid tokens are for continuous, page/section-level scaling; the fixed scale is for
  component-level micro-rhythm.** A fluid type scale and fluid layout tokens (container
  max-width, container padding, section vertical spacing) live alongside the existing
  color/spacing custom properties and scale smoothly with viewport width via `clamp()` — use
  these for font sizes and page/section-level spacing. The existing fixed spacing scale is
  unchanged and stays the right choice for small, local rhythm — gaps between inline
  elements, button/internal padding — where continuous scaling isn't wanted.
- **The two layers exist because CSS custom properties cannot drive `@media`.** A property
  like a breakpoint value cannot be read inside a `@media (min-width: ...)` condition, so the
  breakpoint scale is necessarily a build-time Sass construct (the mixin), while the type/
  spacing tokens that don't need a hard threshold stay runtime CSS custom properties. Reach
  for the fluid tokens by default; reach for a breakpoint mixin only when the layout must
  visibly change shape at a threshold.
- **Mobile nav collapses behind a hamburger below `md`.** Below the `md` breakpoint, primary
  navigation and the account actions collapse behind a hamburger button that toggles a
  dropdown panel; the theme toggle remains visible in the header bar at every width. At `md`
  and above the header is the uncollapsed, always-visible layout.
- **Mobile nav accessibility contract** (required for any future change to this pattern):
  - The hamburger is a real `<button>`, never a link or `div` styled to look like one.
  - Its `aria-expanded` state reflects whether the panel is open, and `aria-controls`
    references the panel so assistive tech can associate the two; its accessible label
    communicates open/closed intent.
  - The panel is removed from layout and the accessibility tree when closed — not merely
    hidden visually.
  - Pressing Escape while the menu is open closes it.
  - Activating a link inside the panel (completing a navigation) closes the menu — it must
    not stay open after the route changes.
  - Focus indication uses the app's existing focus-visible styling; do not introduce a
    separate focus treatment for nav-panel controls.
- **Component SCSS correctness is verified by `ng build`, not by the unit-test suite.** Jest
  does not compile component stylesheets, so a broken `@use` path or an unknown mixin/
  breakpoint name is only caught when the app is built (or served), not by `npm test`. Fluid
  and breakpoint-driven CSS is verified visually at each breakpoint against the running app,
  not through CSS snapshot assertions — there is no meaningful automated substitute for
  looking at the rendered layout.

## Related

- ADR-0012: Adopt a mobile-first responsive foundation (fluid tokens + breakpoint mixins)
  (the decision this doc explains the how-to for)
- ADR-0009: Theme via CSS custom-property tokens with a no-flash init (color-token model;
  this doc's fluid tokens live alongside it but are a separate, size/layout concern)
- ADR-0011: Author components as separate template and SCSS style files (the SCSS authoring
  convention these mixins are used within)
- `src/styles/` (the shared breakpoint and layout partials), the app shell (mobile nav
  implementation)
