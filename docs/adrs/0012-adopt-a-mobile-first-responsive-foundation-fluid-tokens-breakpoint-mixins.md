---
id: '0012'
name: Adopt a mobile-first responsive foundation (fluid tokens + breakpoint mixins)
description: Adopt a fluid-first hybrid responsive foundation — clamp()-based fluid
  type, spacing, and container tokens as the default, plus a named sm/md/lg breakpoint
  scale exposed via a respond-to mixin for structural shifts (e.g. the header collapsing
  to a signal-driven hamburger nav below md) — CSS-first, with no new runtime dependency.
status: proposed
date_proposed: '2026-07-05'
date_accepted: null
date_invalidated: null
author: stimothy
supersedes: []
superseded_by: []
tags:
- architecture
- build
---
# ADR-0012: Adopt a mobile-first responsive foundation (fluid tokens + breakpoint mixins)

<!-- adr-meta:start -->
| Field | Value |
| --- | --- |
| ID | 0012 |
| Name | Adopt a mobile-first responsive foundation (fluid tokens + breakpoint mixins) |
| Description | Adopt a fluid-first hybrid responsive foundation — clamp()-based fluid type, spacing, and container tokens as the default, plus a named sm/md/lg breakpoint scale exposed via a respond-to mixin for structural shifts (e.g. the header collapsing to a signal-driven hamburger nav below md) — CSS-first, with no new runtime dependency. |
| Status | proposed |
| Date proposed | 2026-07-05 |
| Date accepted | — |
| Date invalidated | — |
| Author | stimothy |
| Supersedes | — |
| Superseded by | — |
| Tags | architecture, build |
<!-- adr-meta:end -->

## Context and Problem Statement

Theming (ADR-0009) and a first set of POC pages (landing, home, auth, not-found) exist, but
responsiveness today is **incidental**, not systematic: design tokens cover color, spacing
(`--space-1..8`), radius, and font, but there are no breakpoint tokens, no typography scale,
and zero media queries anywhere in the app. Components get some responsiveness for free from
intrinsic CSS (`flex-wrap`, `auto-fit` grids, `max-width`, `ch`/`rem` units), but that leaves
gaps — most visibly the app-shell header, which crams the brand, product name, two nav links,
the theme toggle, and Log in / Sign up into one row that overflows on a phone, with no mobile
navigation at all.

The app is a POC now but is expected to grow into a full site used across many devices. We
need to establish the right responsive convention now, while the surface is small, so every
future feature inherits it rather than each one inventing its own ad-hoc media queries.

This ADR settles **how responsive layout and typography are authored across the app** — it
does not redesign any page's content or visual identity, and it does not introduce a UI/layout
dependency (e.g. Angular CDK); the approach stays CSS-first.

## Decision Drivers

- Establish one convention before the page count grows, rather than retrofitting many pages
  later.
- Minimize ad-hoc media queries scattered across component styles.
- Keep the app CSS-first with no new runtime or build dependency.
- Provide a real mobile navigation pattern that is accessible, not just visually collapsed.
- Stay consistent with the existing token-based theming model (ADR-0009) and the separate
  template/SCSS authoring convention (ADR-0011).

## Considered Options

- **Fluid-first hybrid** (chosen): fluid `clamp()`-based type/spacing/container tokens as the
  default, continuous scaling with zero media queries, plus a small named breakpoint scale
  with SCSS mixins reserved for the handful of real *structural* shifts (e.g. the header nav
  collapsing to a hamburger).
- **Breakpoints only**: a conventional fixed set of named breakpoints and media queries for
  all responsive behavior (type, spacing, layout alike). Simpler mental model, but produces
  visible "jumps" at breakpoint edges and more media-query boilerplate for what fluid CSS
  handles for free.
- **Fluid only**: `clamp()`-based scaling for everything, no breakpoint mixins at all. Elegant
  for type/spacing, but cannot express true structural shifts (e.g. collapsing a horizontal nav
  into a hamburger dropdown) — that needs a hard threshold, not a continuous scale.
- **Angular CDK `BreakpointObserver`**: a dependency that lets TypeScript react to breakpoints.
  Rejected as unnecessary for now — CSS plus a simple signal-driven menu covers every current
  need; revisit only if a future feature needs TypeScript to branch on breakpoints beyond what
  CSS and the existing signal already handle.

## Decision Outcome

Chosen option: **fluid-first hybrid**, because it gives type and spacing continuous,
media-query-free scaling by default (fewer visible jumps, less boilerplate) while still
providing a small, named breakpoint scale for the real structural shifts that fluid CSS cannot
express — with no new dependency.

**Two layers**, because CSS custom properties cannot be used inside `@media` conditions
(`@media (min-width: var(--bp-md))` does not work):

1. **Runtime tokens** — fluid `clamp()`-based tokens defined in `styles.scss` `:root`
   alongside the existing ADR-0009 color/spacing tokens: a fluid type scale
   (`--font-size-sm` … `--font-size-3xl`) and fluid layout tokens (`--container-max`,
   `--container-pad`, `--space-section`). These scale continuously with viewport width and
   need no media queries. The existing fixed `--space-1..8` scale is unchanged and remains for
   component-level micro-rhythm (gaps, button padding); fluid tokens are for page/section-level
   scaling.
2. **Build-time breakpoints** — a Sass map and mobile-first (`min-width`) `respond-to($name)`
   mixin in a new `src/styles/_breakpoints.scss`, with a named scale of `sm` (`30rem`), `md`
   (`48rem`), `lg` (`64rem`). Used only for structural shifts, not for type/spacing, which the
   fluid tokens already cover. A companion `container` mixin in `src/styles/_layout.scss`
   centralizes max-width, fluid inline padding, and horizontal centering, replacing repeated
   ad-hoc `max-width` rules.

Both partials are shared with component styles via `angular.json`
`stylePreprocessorOptions.includePaths: ["src/styles"]`, so any component can
`@use 'breakpoints' as bp;` / `@use 'layout' as layout;` without brittle relative paths.

**Mobile nav**: below `md`, the app-shell header collapses its nav links and Log in / Sign up
behind a hamburger button that toggles a dropdown panel; the theme toggle stays visible in the
bar. State is a `menuOpen` signal on the app component (no new dependency, `OnPush`). The
hamburger is a real `<button>` with `aria-expanded` bound to the signal and `aria-controls`
referencing the panel, the panel is removed from layout and the accessibility tree when closed,
Escape closes the menu, and navigating to a new route (Router `NavigationEnd`) closes it too.

This is CSS-first: no UI/layout dependency (e.g. Angular CDK) is introduced. Container queries
(`@container`) and Angular CDK `BreakpointObserver` are explicitly out of scope for now (see
Considered Options) and are revisited only if a future need — component-level reflow, or
TypeScript branching on breakpoints — actually requires them.

### Consequences

- Good: one systematic convention established while the app is still small, so every future
  feature inherits fluid tokens and the `respond-to` / `container` mixins instead of inventing
  ad-hoc media queries; type and spacing scale continuously with no visible breakpoint jumps;
  zero new runtime dependencies; a real, accessible mobile navigation pattern replaces an
  overflowing header.
- Good: the shared partials via `angular.json` `includePaths` mean any component can reach the
  breakpoint/layout mixins without brittle relative `@use` paths.
- Bad: two layers (runtime tokens vs. build-time breakpoints) to reason about, because CSS
  custom properties cannot drive `@media` — contributors must know which layer a given
  responsive need belongs to.
- Bad: SCSS mixin correctness is verified only by `ng build` (a full Angular/Sass compile);
  Jest does not compile component SCSS, so a broken `@use` path or mixin call is caught by the
  build, not by the unit-test suite.
- Bad: future features must use these tokens/mixins rather than ad-hoc media queries for
  consistency to hold — this is a convention, not something the compiler enforces.

## Links

- ADR-0009: Theme via CSS custom-property tokens with a no-flash init (color/spacing token
  model this ADR extends with fluid size/layout tokens)
- ADR-0011: Author components as separate template and SCSS style files (SCSS authoring
  convention this ADR's mixins build on)
- ADR-0002: Adopt Angular, npm, and nginx-on-Docker for the frontend (stack)
