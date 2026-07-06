---
id: '0011'
name: Author components as separate template and SCSS style files
description: Author every component as separate co-located files — a TypeScript class,
  an HTML template, and an SCSS stylesheet — instead of inline template/styles literals,
  and adopt SCSS as the style-authoring language while theming stays on the CSS custom-property
  tokens of ADR-0009.
status: accepted
date_proposed: '2026-07-05'
date_accepted: '2026-07-05'
date_invalidated: null
author: stimothy
supersedes: []
superseded_by: []
tags:
- architecture
- build
---
# ADR-0011: Author components as separate template and SCSS style files

<!-- adr-meta:start -->
| Field | Value |
| --- | --- |
| ID | 0011 |
| Name | Author components as separate template and SCSS style files |
| Description | Author every component as separate co-located files — a TypeScript class, an HTML template, and an SCSS stylesheet — instead of inline template/styles literals, and adopt SCSS as the style-authoring language while theming stays on the CSS custom-property tokens of ADR-0009. |
| Status | accepted |
| Date proposed | 2026-07-05 |
| Date accepted | 2026-07-05 |
| Date invalidated | — |
| Author | stimothy |
| Supersedes | — |
| Superseded by | — |
| Tags | architecture, build |
<!-- adr-meta:end -->

## Context and Problem Statement

The scaffolding components were written with inline `template` and `styles` literals in the
`@Component` decorator. As the app grows into real features this couples three concerns —
class logic, markup, and styling — into one file: the actual component logic sinks below
hundreds of lines of template and style strings (`landing.component.ts` is already ~236 lines,
mostly literals), diffs mix structural and behavioral changes, and editor tooling for HTML/CSS
degrades inside TypeScript template literals. We need a single, repo-wide convention for how
components are authored so the codebase stays consistent as it grows (CLAUDE.md: organize by
feature, small single-responsibility units). Style authoring is part of the same question: the
codebase uses plain `.css`, and we want the ergonomics (nesting, `@use`) of a preprocessor.

This ADR settles **how component templates and styles are authored** — not the theming model,
which ADR-0009 owns and this ADR preserves unchanged.

## Decision Drivers

- Separation of concerns: keep class logic, markup, and styles in distinct, co-located files.
- Consistency: one convention every component follows, enforced at code-generation time.
- Editor/tooling fidelity for HTML and styles outside TypeScript string literals.
- Reviewable diffs: structural, stylistic, and behavioral changes land in separate files.
- Style-authoring ergonomics without a new runtime dependency.

## Considered Options

- Separate `.ts` / `.html` / `.scss` files per component, SCSS as the style language (chosen).
- Keep inline `template`/`styles` literals in the decorator.
- Separate files but keep plain `.css` (no preprocessor).

## Decision Outcome

Chosen: **every component is authored as three co-located files — `<name>.component.ts`,
`<name>.component.html`, and `<name>.component.scss` — referenced via `templateUrl` and
`styleUrl`/`styleUrls`; inline `template`/`styles` literals are not used.** SCSS is the
style-authoring language for both component and global styles. This is wired into
`angular.json` schematics (`@schematics/angular:component`:
`inlineTemplate: false`, `inlineStyle: false`, `style: "scss"`) so `ng generate component`
produces the convention by default, and it applies retroactively to the existing components.

The Sass compiler ships with `@angular/build`, so SCSS adds **no new npm dependency**.

**Boundary with ADR-0009 (theming):** SCSS here is purely an authoring convenience
(nesting, `@use`). It does **not** reintroduce the "per-component SCSS theme mixins" option
that ADR-0009 rejected. Theming remains defined by semantic CSS custom-property tokens
switched via `data-theme`; component `.scss` files reference `var(--color-*)` / `var(--space-*)`
/ `var(--radius-*)` only and must not hard-code colors or embed theme logic in Sass.

**Rules:**

- No inline `template` or `styles` in `@Component`; use `templateUrl` and `styleUrl`/`styleUrls`.
- Style files are `.scss`; component styles reference ADR-0009 semantic tokens only.
- Shared style partials (e.g. `auth-forms.scss`) may be referenced by multiple components'
  `styleUrls`.

### Consequences

- Good: clear separation of concerns; consistent, generator-enforced structure; better
  HTML/SCSS tooling; cleaner diffs; SCSS ergonomics with zero added dependency.
- Bad: three files per component instead of one (more files to navigate for tiny components);
  a one-time refactor of the existing inline components; contributors must keep the Sass/CSS
  split disciplined so theming logic does not leak into SCSS.

## Links

- ADR-0002: Adopt Angular, npm, and nginx-on-Docker for the frontend (stack)
- ADR-0009: Theme via CSS custom-property tokens (theming model this ADR preserves)
- ADR-0004: Enforce code quality and security gates (structure/quality intent)
