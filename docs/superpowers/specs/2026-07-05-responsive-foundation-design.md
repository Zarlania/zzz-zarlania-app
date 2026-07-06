# Design: Mobile-first responsive foundation

**Issue:** #18
**Date:** 2026-07-05
**Status:** Approved (brainstorming) — pending implementation plan

## Problem

Theming and a set of POC pages (landing, home, auth, not-found) exist, but
responsiveness today is *incidental*, not systematic:

- Design tokens cover color, spacing (`--space-1..8`), radius, and font — but there
  are **no breakpoint tokens, no typography scale, and zero media queries** anywhere.
- Components rely only on *intrinsic* responsiveness (`flex-wrap`, `auto-fit` grids,
  `max-width`, `ch`/`rem` units). That covers some cases for free but leaves gaps.
- The **app-shell header** crams brand + name + 2 nav links + theme toggle + Log in +
  Sign up into one row, which overflows on a phone. There is no mobile nav.

The app is a POC now but will grow into a full site used across devices. We want to
establish the *right convention now*, while the surface is small, so every future
feature inherits it.

## Goals

Establish a systematic mobile-first responsive foundation as part of the design system,
then retrofit the existing pages so the whole app works across screen sizes.

**Non-goals:** redesigning page content/visual identity; adding new features or routes;
introducing a UI/layout dependency (e.g. Angular CDK) — we stay CSS-first.

## Decision summary

- **Approach:** fluid-first *hybrid* — fluid type + spacing by default (continuous
  scaling, no media queries), plus a small named breakpoint scale with SCSS mixins for
  the handful of real structural shifts.
- **Mobile nav:** hamburger → dropdown panel below `md`, signal-driven, fully accessible.
- **Docs:** a new ADR records the decision as law; a new reference doc is the living
  how-to guide.

## Architecture — where responsive rules live

Two layers, because **CSS custom properties cannot be used inside `@media` conditions**
(`@media (min-width: var(--bp-md))` does not work):

1. **Runtime tokens** — in `styles.scss` `:root`, alongside existing color/spacing
   tokens. Fluid values that scale continuously via `clamp()`: a fluid type scale and
   fluid section-spacing / container tokens. These respond to viewport width with zero
   media queries.
2. **Build-time breakpoints** — a new `src/styles/_breakpoints.scss` holding a Sass map
   plus a mobile-first `respond-to($name)` mixin (`min-width` based). Used only for
   *structural* shifts.

### Breakpoint scale

Mobile-first (`min-width`), authored in `rem`:

| Name | Value        |
|------|--------------|
| `sm` | `30rem` (480px)  |
| `md` | `48rem` (768px)  |
| `lg` | `64rem` (1024px) |

```scss
// src/styles/_breakpoints.scss
$breakpoints: (
  sm: 30rem,
  md: 48rem,
  lg: 64rem,
);

@mixin respond-to($name) {
  $value: map.get($breakpoints, $name);
  @if $value == null {
    @error "Unknown breakpoint: #{$name}";
  }
  @media (min-width: $value) {
    @content;
  }
}
```

### Container helper

A `container` mixin (`src/styles/_layout.scss`) centralizes max-width + fluid inline
padding + horizontal centering, replacing the ad-hoc `max-width` repeated across landing
sections:

```scss
@mixin container {
  width: 100%;
  max-width: var(--container-max);
  margin-inline: auto;
  padding-inline: var(--container-pad);
}
```

### Build wiring

`angular.json` gains `stylePreprocessorOptions.includePaths: ["src/styles"]` on the
**build, test, and server** targets so any component SCSS can `@use 'breakpoints' as bp;`
and `@use 'layout' as layout;` without brittle relative paths. (Verify exact target names
during implementation.)

## Design tokens added

Added to `styles.scss` `:root` (both themes inherit — these are size/space tokens, not
color, so they live once at the root):

- **Fluid type scale** — a small named set, each `clamp(min, preferred-with-vw, max)`:
  `--font-size-sm`, `--font-size-base`, `--font-size-lg`, `--font-size-xl`,
  `--font-size-2xl`, `--font-size-3xl`. Components reference these instead of hardcoded
  `rem`/`px` font sizes.
- **Fluid layout tokens:**
  - `--container-max` (~`72rem`)
  - `--container-pad` — `clamp()` inline padding
  - `--space-section` — `clamp()` for vertical section rhythm

The existing fixed `--space-1..8` scale stays for component-level micro-rhythm (gaps,
button padding, etc.). Fluid tokens are for page/section-level scaling.

## Mobile header / nav

Desktop (≥ `md`) is unchanged: brand left, nav center, actions right. Below `md`:

- Nav links + Log in / Sign up collapse behind a hamburger button that toggles a panel
  dropping down under the header. The **theme toggle stays visible** in the bar.
- State is a `menuOpen` **signal** in `AppComponent` — no dependency, `OnPush`.

### Accessibility contract

- The hamburger is a `<button>` (not a link/div) with:
  - `aria-expanded` bound to `menuOpen`
  - `aria-controls` referencing the panel's `id`
  - an accessible label (e.g. `aria-label="Menu"`) that reflects open/closed intent
- The panel is hidden from layout and a11y tree when closed.
- **Escape closes** the menu (`HostListener('document:keydown.escape')`).
- **Navigation closes** the menu: subscribe to the Router's `NavigationEnd` so tapping a
  link inside the panel doesn't leave it open.
- Focus styles use the existing `:focus-visible` token.

## Retrofit scope

Audit and fix every current surface at `sm` / `md` / `lg`:

- App-shell header + footer (`app.component.*`)
- Landing (`features/landing`)
- Home (`features/home`)
- Auth — login + signup (`features/auth/**`, `auth-forms.scss`)
- Not-found (`features/not-found`)

Most already use intrinsic patterns; the work is mainly: swap hardcoded font sizes for
fluid type tokens, apply the `container` mixin in place of repeated `max-width`, apply
`--space-section` for vertical rhythm, and implement the header nav. No content redesign.

## Testing & verification

- **TDD the nav behavior** through the public surface (this is what meaningfully
  satisfies the ≥ 80% coverage gate):
  - `aria-expanded` reflects `menuOpen` state
  - nav links / auth links are present-and-visible only when open (queried through the
    rendered DOM, not by poking internals)
  - Escape closes an open menu
  - a `NavigationEnd` event closes an open menu
- **Fluid CSS / layout at breakpoints** is not meaningfully unit-testable and will **not**
  be asserted via CSS snapshots. It is verified visually at each breakpoint against the
  running app using the `/run` (or `/verify`) skill. No test theater.

## Documentation

- **New ADR** — records the decision as law: fluid-first hybrid, the breakpoint scale,
  the two-layer token/breakpoint split and mixin convention, and the mobile-nav pattern.
  Created via the `adr-create` skill; `./scripts/adr check` after.
- **New reference doc** — living how-to: the breakpoints, how to use `respond-to` and
  `container`, the fluid tokens, and the nav a11y contract. Created via `./scripts/ref
  new`; `./scripts/ref check` after. Documents behavior/rules, not component APIs.

## Release

`minor` (feature). Apply the `release:minor` label and run
`./scripts/bump-version bump minor` inside the PR.

## Out of scope / future

- Container queries (`@container`) — revisit when component-level responsiveness (cards
  reflowing based on their own width, not the viewport) is needed.
- Angular CDK `BreakpointObserver` — only if we later need TypeScript to *react* to
  breakpoints beyond what CSS + the signal-driven menu handle.
