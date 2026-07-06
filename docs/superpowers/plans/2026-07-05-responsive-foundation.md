# Mobile-first Responsive Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a systematic mobile-first responsive foundation (fluid tokens + breakpoint mixins + a real mobile nav) and retrofit the existing pages so the whole app works across screen sizes.

**Architecture:** Two layers. (1) Runtime fluid tokens in `src/styles.scss` `:root` (`clamp()` type scale, fluid section spacing, container tokens) that scale continuously with zero media queries. (2) Build-time breakpoints in a new `src/styles/_breakpoints.scss` (Sass map + `respond-to` mixin) plus a `container` mixin in `src/styles/_layout.scss`, shared with component SCSS via an `angular.json` `includePaths`. The header gets a signal-driven hamburger dropdown for small screens.

**Tech Stack:** Angular 22, TypeScript 6, SCSS, Jest (`jest-preset-angular`), npm. No new runtime dependencies (CSS-first).

## Global Constraints

- **Issue:** every change ties to GitHub issue **#18**; work on branch **`feat/18-responsive-foundation`** (already created and checked out).
- **Release:** **minor** (feature). Bump **inside the PR** via `./scripts/bump-version bump minor`; apply the `release:minor` label.
- **ADR-0009:** components reference **semantic CSS tokens only — never raw hex**.
- **ADR-0011:** components use **separate `.html` template and `.scss` style files** (no inline template/styles).
- **Components:** standalone, `ChangeDetectionStrategy.OnPush`, prefer **signals** and immutability.
- **Coverage:** Jest global threshold **≥ 80%** (branches/functions/lines/statements) over `src/app/**/*.ts`.
- **No new dependencies:** do not add `@angular/cdk` or any package. Mobile nav is CSS + a signal.
- **SCSS validation caveat (verified):** Jest does **not** compile component `styleUrl` SCSS. A broken `@use` or mixin call will **not** fail any jest test — it is caught **only** by `ng build`. Every task that touches SCSS using the shared partials **must** run `npm run build` as a verification step.
- **Breakpoint scale (mobile-first, `min-width`):** `sm` = `30rem` (480px), `md` = `48rem` (768px), `lg` = `64rem` (1024px). The header collapses to the hamburger **below `md`**.
- **Lint/format:** pre-commit hooks run ESLint + Prettier; run `npm run lint` before committing.

---

## File Structure

**Create:**
- `src/styles/_breakpoints.scss` — Sass `$breakpoints` map + `respond-to($name)` mixin.
- `src/styles/_layout.scss` — `container` mixin (max-width + fluid inline padding + centering).
- `docs/adrs/00XX-...md` — ADR recording the responsive-foundation decision (id assigned by the `adr-create` skill).
- `docs/reference/0000XX-responsive-and-layout-conventions.md` — living how-to (id assigned by `./scripts/ref new`).

**Modify:**
- `angular.json` — add `stylePreprocessorOptions.includePaths: ["src/styles"]` to `build.options`.
- `src/styles.scss` — add fluid type scale + fluid layout tokens to `:root`.
- `src/app/app.component.ts` — `menuOpen` signal + `toggleMenu`/`closeMenu`/`onEscape`.
- `src/app/app.component.html` — hamburger button + collapsible `#site-menu` panel.
- `src/app/app.component.scss` — mobile-first header, dropdown panel, `respond-to(md)` desktop layout.
- `src/app/app.component.spec.ts` — behavioral tests for the mobile nav.
- `src/app/features/landing/landing.component.scss` — fluid tokens + `container`.
- `src/app/features/home/home.component.scss` — fluid tokens + fluid gutters.
- `src/app/features/auth/auth-forms.scss` — fluid tokens + fluid gutters.
- `package.json` — version bump (final task).

---

## Task 1: Responsive foundation — breakpoints, layout mixin, fluid tokens, build wiring

Establishes the shared primitives everything else consumes. No unit tests (pure SCSS/config; coverage is TS-only). Verified by `npm run build`.

**Files:**
- Create: `src/styles/_breakpoints.scss`
- Create: `src/styles/_layout.scss`
- Modify: `angular.json:18-34` (`build.options`)
- Modify: `src/styles.scss:15-26` (append tokens inside the existing `:root` block)

**Interfaces:**
- Produces (for later tasks):
  - `@use 'breakpoints' as bp;` → `@include bp.respond-to(sm | md | lg) { ... }` (emits a `min-width` media query).
  - `@use 'layout' as layout;` → `@include layout.container;` (sets `max-width: var(--container-max)`, `margin-inline: auto`, `padding-inline: var(--container-pad)`).
  - CSS custom properties on `:root`: `--font-size-sm|base|lg|xl|2xl|3xl`, `--container-max`, `--container-pad`, `--space-section`.

- [ ] **Step 1: Create the breakpoints partial**

Create `src/styles/_breakpoints.scss`:

```scss
@use 'sass:map';

// Mobile-first breakpoint scale. See ADR (responsive foundation) and
// docs/reference responsive-and-layout-conventions.
$breakpoints: (
  sm: 30rem, // 480px
  md: 48rem, // 768px
  lg: 64rem, // 1024px
);

// Emit a min-width media query for a named breakpoint.
@mixin respond-to($name) {
  $value: map.get($breakpoints, $name);
  @if $value == null {
    @error "Unknown breakpoint `#{$name}`. Valid: #{map.keys($breakpoints)}.";
  }
  @media (min-width: $value) {
    @content;
  }
}
```

- [ ] **Step 2: Create the layout partial**

Create `src/styles/_layout.scss`:

```scss
// Centered content column with fluid side gutters. Relies on the
// --container-max / --container-pad tokens defined in styles.scss.
@mixin container {
  width: 100%;
  max-width: var(--container-max);
  margin-inline: auto;
  padding-inline: var(--container-pad);
}
```

- [ ] **Step 3: Wire the SCSS include path into the build**

In `angular.json`, inside `projects.zarlania-app.architect.build.options` (currently ending at `"outputMode": "static"` on line 33), add a `stylePreprocessorOptions` key. The `options` block becomes:

```jsonc
"styles": ["src/styles.scss"],
"scripts": [],
"server": "src/main.server.ts",
"outputMode": "static",
"stylePreprocessorOptions": {
  "includePaths": ["src/styles"]
}
```

- [ ] **Step 4: Add fluid tokens to the global stylesheet**

In `src/styles.scss`, inside the existing `:root, :root[data-theme='dark']` block, immediately after the `--font-sans: ...;` line (line 25) and before the closing `}` (line 26), add:

```scss
  /* Fluid type scale — clamp(min, preferred + vw, max). */
  --font-size-sm: clamp(0.8rem, 0.75rem + 0.25vw, 0.9rem);
  --font-size-base: clamp(0.95rem, 0.9rem + 0.3vw, 1.05rem);
  --font-size-lg: clamp(1.05rem, 0.98rem + 0.4vw, 1.2rem);
  --font-size-xl: clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem);
  --font-size-2xl: clamp(1.5rem, 1.3rem + 0.9vw, 2rem);
  --font-size-3xl: clamp(2rem, 1.6rem + 1.8vw, 3rem);

  /* Fluid layout tokens. */
  --container-max: 72rem;
  --container-pad: clamp(1rem, 0.6rem + 2vw, 2rem);
  --space-section: clamp(2.5rem, 1.8rem + 3vw, 4.5rem);
```

These are size/space tokens (not color), so they live once in the base `:root` block and are inherited by the light theme — do **not** duplicate them in `:root[data-theme='light']`.

- [ ] **Step 5: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds (exit 0), no Sass errors. This proves the tokens are valid and the include path is wired. (The `respond-to`/`container` mixins are first exercised by a consumer in Task 2/Task 3 — an unused partial is not compiled.)

- [ ] **Step 6: Lint and commit**

```bash
npm run lint
git add src/styles/_breakpoints.scss src/styles/_layout.scss src/styles.scss angular.json
git commit -m "feat: responsive token + breakpoint foundation (#18)"
```

---

## Task 2: Mobile header navigation (hamburger dropdown)

The one behavioral piece. TDD: write failing tests against the public DOM surface first, then implement. Mobile nav closes on link activation (the testable form of "close on navigation") and on Escape.

**Files:**
- Modify: `src/app/app.component.ts:1-16`
- Modify: `src/app/app.component.html:1-16` (the `<header>` block)
- Modify: `src/app/app.component.scss` (header/nav/actions sections)
- Test: `src/app/app.component.spec.ts` (add to the existing `describe`)

**Interfaces:**
- Consumes: `@use 'breakpoints' as bp;` and the fluid tokens from Task 1.
- Produces (public component surface): `menuOpen: Signal<boolean>` (initially `false`), `toggleMenu(): void`, `closeMenu(): void`, `onEscape(): void` (bound via `@HostListener('document:keydown.escape')`). Template contract: a `<button class="menu-toggle">` with `aria-controls="site-menu"` and `[attr.aria-expanded]="menuOpen()"`; a `#site-menu` container with `[class.open]="menuOpen()"` holding `nav.site-nav` and `.header-actions`; each link inside calls `closeMenu()` on click.

- [ ] **Step 1: Write the failing tests**

Append these tests inside the existing `describe('AppComponent (shell)', ...)` block in `src/app/app.component.spec.ts` (after the last `it(...)`, before the closing `});`):

```ts
it('renders a menu toggle button that is collapsed by default', () => {
  const fixture = TestBed.createComponent(AppComponent);
  fixture.detectChanges();
  const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('button.menu-toggle');
  expect(toggle).toBeTruthy();
  expect(toggle.getAttribute('aria-controls')).toBe('site-menu');
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
});

it('opens the menu when the toggle is clicked', () => {
  const fixture = TestBed.createComponent(AppComponent);
  fixture.detectChanges();
  const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('button.menu-toggle');
  toggle.click();
  fixture.detectChanges();
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(fixture.nativeElement.querySelector('#site-menu.open')).toBeTruthy();
});

it('closes the menu when a menu link is activated', () => {
  const fixture = TestBed.createComponent(AppComponent);
  fixture.detectChanges();
  fixture.componentInstance.toggleMenu();
  fixture.detectChanges();
  const link: HTMLAnchorElement = fixture.nativeElement.querySelector('#site-menu a');
  link.click();
  fixture.detectChanges();
  const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('button.menu-toggle');
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
});

it('closes the menu when Escape is pressed', () => {
  const fixture = TestBed.createComponent(AppComponent);
  fixture.detectChanges();
  fixture.componentInstance.toggleMenu();
  fixture.detectChanges();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  fixture.detectChanges();
  const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('button.menu-toggle');
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/app/app.component.spec.ts`
Expected: FAIL — the 4 new tests fail (no `button.menu-toggle`; `toggleMenu` is not a function). The 7 existing tests still pass.

- [ ] **Step 3: Implement the component logic**

Replace the entire contents of `src/app/app.component.ts` with:

```ts
import { ChangeDetectionStrategy, Component, HostListener, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { LogoComponent } from './shared/logo/logo.component';
import { ThemeToggleComponent } from './shared/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, LogoComponent, ThemeToggleComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly year = new Date().getFullYear();
  readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuOpen.set(false);
  }
}
```

- [ ] **Step 4: Implement the template**

Replace the `<header>...</header>` block (lines 1-16) in `src/app/app.component.html` with:

```html
<header class="site-header">
  <a class="brand" routerLink="/">
    <app-logo />
    <span class="brand-name">Zarlania</span>
  </a>

  <div id="site-menu" class="site-menu" [class.open]="menuOpen()">
    <nav class="site-nav">
      <a routerLink="/" fragment="features" (click)="closeMenu()">Features</a>
      <a routerLink="/" fragment="how-it-works" (click)="closeMenu()">How it works</a>
    </nav>
    <div class="header-actions">
      <a class="link-login" routerLink="/login" (click)="closeMenu()">Log in</a>
      <a class="btn-signup" routerLink="/signup" (click)="closeMenu()">Sign up</a>
    </div>
  </div>

  <div class="bar-controls">
    <app-theme-toggle />
    <button
      type="button"
      class="menu-toggle"
      aria-label="Menu"
      aria-controls="site-menu"
      [attr.aria-expanded]="menuOpen()"
      (click)="toggleMenu()"
    >
      <span class="menu-toggle-bar"></span>
      <span class="menu-toggle-bar"></span>
      <span class="menu-toggle-bar"></span>
    </button>
  </div>
</header>
```

(Leave the `<main>` and `<footer>` blocks below unchanged.)

- [ ] **Step 5: Implement the styles**

In `src/app/app.component.scss`, add `@use 'breakpoints' as bp;` as the **first line** of the file. Then replace the existing `.site-header`, `.site-nav`, `.site-nav a`, and `.header-actions` rules (lines 1-7 and 19-32) with the mobile-first block below, and add the new `.bar-controls` / `.menu-toggle` / `.site-menu` rules. Keep `.brand`, `.brand-name`, `.link-login`, `.btn-signup`, and all `.site-footer*` rules as they are.

```scss
.site-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--container-pad);
  border-bottom: 1px solid var(--color-border);
}

.bar-controls {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.menu-toggle {
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  width: 40px;
  height: 40px;
  padding: 0 8px;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
}
.menu-toggle-bar {
  display: block;
  height: 2px;
  background: var(--color-text);
  border-radius: 2px;
}

.site-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 20;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4) var(--container-pad);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);

  &.open {
    display: flex;
  }
}

.site-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.site-nav a {
  color: var(--color-text-muted);
  text-decoration: none;
}

.header-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
}

@include bp.respond-to(md) {
  .menu-toggle {
    display: none;
  }
  .site-menu {
    display: flex;
    position: static;
    flex: 1;
    flex-direction: row;
    align-items: center;
    gap: var(--space-4);
    padding: 0;
    background: none;
    border: none;
  }
  .site-nav {
    flex-direction: row;
    gap: var(--space-4);
  }
  .header-actions {
    flex-direction: row;
    align-items: center;
    margin-left: auto;
  }
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx jest src/app/app.component.spec.ts`
Expected: PASS — all 11 tests (7 existing + 4 new) green.

- [ ] **Step 7: Verify the build compiles the SCSS**

Run: `npm run build`
Expected: build succeeds. This is the **only** check that the `@use 'breakpoints'` + `bp.respond-to(md)` in the component actually compile (jest ignores component SCSS).

- [ ] **Step 8: Visually verify the mobile nav**

Use the `/run` skill to serve the app (`npm start`) and open `http://localhost:4200`. Confirm at a narrow viewport (~375px): the hamburger shows, tapping it drops the panel with Features / How it works / Log in / Sign up, the theme toggle stays in the bar, Escape and tapping a link both close it. At ≥ 768px: the hamburger is gone and the nav + actions lay out inline as before.

- [ ] **Step 9: Lint and commit**

```bash
npm run lint
git add src/app/app.component.ts src/app/app.component.html src/app/app.component.scss src/app/app.component.spec.ts
git commit -m "feat: mobile hamburger navigation in app shell (#18)"
```

---

## Task 3: Retrofit page styles to fluid tokens

Swap hardcoded font sizes for the fluid scale, use fluid gutters/section spacing, and apply the `container` mixin to the wide landing sections. Pure SCSS — no unit tests; verified by `npm run build` + visual check. Content and structure are unchanged (no redesign).

**Files:**
- Modify: `src/app/features/landing/landing.component.scss`
- Modify: `src/app/features/home/home.component.scss`
- Modify: `src/app/features/auth/auth-forms.scss`

**Interfaces:**
- Consumes: fluid tokens + `container` mixin from Task 1.

- [ ] **Step 1: Retrofit the landing styles**

In `src/app/features/landing/landing.component.scss`, add `@use 'layout' as layout;` as the **first line**. Then apply these edits:

- `.hero` (lines 11-14): replace the rule body with a centered container + fluid vertical rhythm:

```scss
.hero {
  @include layout.container;
  padding-block: var(--space-section);
}
```

- `.hero h1` (line 16): change `font-size: 2.4rem;` → `font-size: var(--font-size-3xl);`
- `.lead` (line 21): change `font-size: 1.05rem;` → `font-size: var(--font-size-lg);`
- `.section` (lines 47-50): replace with:

```scss
.section {
  @include layout.container;
  padding-block: var(--space-section);
  border-top: 1px solid var(--color-border);
}
```

- `.section h2` (line 52): change `font-size: 1.5rem;` → `font-size: var(--font-size-2xl);`
- `.card p` (line 79): change `font-size: 0.9rem;` → `font-size: var(--font-size-sm);`
- `.eyebrow` (line 7): change `font-size: 0.7rem;` → `font-size: var(--font-size-sm);`
- `.chip` (line 117) and `.card p` small text stay on `--font-size-sm`. Leave `.step-n`, `.chip`, grid rules, and colors unchanged.

- [ ] **Step 2: Retrofit the home styles**

In `src/app/features/home/home.component.scss`:

- `.home` (lines 1-5): keep the narrow centered form; make the gutter fluid:

```scss
.home {
  max-width: 34rem;
  margin: 0 auto;
  padding: var(--space-8) var(--container-pad);
}
```

- `.teaser-sub` (line 55) and `.account-card dd`-adjacent small text: change `.teaser-sub` `font-size: 0.85rem;` → `font-size: var(--font-size-sm);`. Leave the rest unchanged.

- [ ] **Step 3: Retrofit the auth form styles**

In `src/app/features/auth/auth-forms.scss`:

- `.auth` (lines 2-6): keep narrow, fluid gutter:

```scss
.auth {
  max-width: 24rem;
  margin: 0 auto;
  padding: var(--space-8) var(--container-pad);
}
```

- `.alt` (line 45): change `font-size: 0.85rem;` → `font-size: var(--font-size-sm);`. Leave field/input/button rules unchanged.

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds — proves `@use 'layout'` + `layout.container` and all token references compile.

- [ ] **Step 5: Verify existing tests still pass**

Run: `npm run test:ci`
Expected: all suites pass, coverage ≥ 80%. (No behavior changed; this guards against accidental template/logic breakage.)

- [ ] **Step 6: Visually verify pages across sizes**

With the app served (`/run` skill), check landing, home, login, signup, and a 404 route at ~375px, ~768px, and ~1200px. Confirm: no horizontal scrollbar, text scales smoothly, cards reflow (they already use `auto-fit`), and landing content is centered within `--container-max` on wide screens. Tune any clamp value that looks off before committing.

- [ ] **Step 7: Lint and commit**

```bash
npm run lint
git add src/app/features/landing/landing.component.scss src/app/features/home/home.component.scss src/app/features/auth/auth-forms.scss
git commit -m "feat: retrofit page styles to fluid responsive tokens (#18)"
```

---

## Task 4: Document the decision — ADR + reference doc

Record the responsive foundation as law (ADR) and as a living how-to (reference doc), per the repo's documentation model.

**Files:**
- Create: `docs/adrs/00XX-*.md` (via `adr-create` skill)
- Create: `docs/reference/0000XX-*.md` (via `./scripts/ref new`)

- [ ] **Step 1: Confirm no existing ADR already covers this**

Run: `./scripts/adr find "responsive"` and `./scripts/adr find "breakpoint"`
Expected: no existing ADR covers responsive/breakpoints (ADR-0009 is theming colors only). If one exists, stop and reconcile.

- [ ] **Step 2: Author the ADR**

Use the **`adr-create` skill** to create the ADR. Content:
- **Title:** "Adopt a mobile-first responsive foundation (fluid tokens + breakpoint mixins)"
- **Context:** responsiveness was incidental; app will grow across devices; need one convention established while small.
- **Decision:** fluid-first hybrid — fluid `clamp()` type/spacing/container tokens as the default, plus a named `sm`/`md`/`lg` (`30`/`48`/`64rem`) breakpoint scale exposed via a `respond-to` mixin for structural shifts; a `container` mixin for centered columns; header collapses to a signal-driven hamburger dropdown below `md`; CSS-first, no new dependency. Note the two-layer split (runtime tokens vs build-time breakpoints) exists because CSS custom properties cannot drive `@media`.
- **Consequences:** shared partials via `angular.json` `includePaths`; SCSS mixin correctness is verified by `ng build` (jest does not compile component SCSS); future features must use these tokens/mixins rather than ad-hoc media queries. Relates to ADR-0009 (theming tokens) and ADR-0011 (separate SCSS files).

- [ ] **Step 3: Validate the ADR**

Run: `./scripts/adr check`
Expected: passes (registry/format valid).

- [ ] **Step 4: Author the reference doc**

Run: `./scripts/ref new --title "Responsive and layout conventions" --tags frontend,styling`
Then fill it in as a living how-to (behavior/rules, not code APIs):
- the breakpoint scale and mobile-first (`min-width`) rule;
- how to `@use 'breakpoints' as bp;` and call `bp.respond-to(<name>)`;
- how to `@use 'layout' as layout;` and call `layout.container`;
- the fluid token catalog (`--font-size-*`, `--container-*`, `--space-section`) and when to use fluid tokens vs the fixed `--space-1..8`;
- the mobile-nav pattern + a11y contract (hamburger `aria-expanded`/`aria-controls`, Escape closes, link activation closes);
- the caveat that component SCSS is validated by `ng build`, not jest.

- [ ] **Step 5: Validate the reference doc**

Run: `./scripts/ref check`
Expected: passes.

- [ ] **Step 6: Commit**

```bash
npm run lint
git add docs/adrs docs/reference
git commit -m "docs: ADR + reference doc for responsive foundation (#18)"
```

---

## Task 5: Version bump and pull request

Cut the SemVer bump inside the PR and open it, per ADR-0006.

**Files:**
- Modify: `package.json` (`version`)

- [ ] **Step 1: Bump the version**

Run: `./scripts/bump-version bump minor`
Expected: `package.json` `"version"` advances by one minor over the latest release tag.

- [ ] **Step 2: Commit the bump**

```bash
git add package.json
git commit -m "chore: bump version for responsive foundation (#18)"
```

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feat/18-responsive-foundation
gh pr create --title "feat: mobile-first responsive foundation (#18)" \
  --label "release:minor" \
  --body "$(cat <<'EOF'
Closes #18.

Establishes a mobile-first responsive foundation and retrofits the POC pages.

- Fluid `clamp()` type scale + container/section-spacing tokens in `styles.scss`.
- `sm`/`md`/`lg` breakpoint scale via a `respond-to` mixin; `container` mixin; shared with components via `angular.json` `includePaths`.
- Signal-driven hamburger dropdown nav below `md` (aria-expanded/controls, Escape + link-activation close), unit-tested.
- Retrofitted landing/home/auth styles to fluid tokens.
- New ADR (decision) + reference doc (how-to).

Release: minor.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Verify CI is green**

Run: `gh pr checks --watch`
Expected: lint, tests/coverage, and the "Release version bump" check all pass. Address any failures before requesting review.

---

## Self-Review

**Spec coverage:**
- Two-layer architecture (runtime tokens vs build-time breakpoints) → Task 1. ✓
- Breakpoint scale `sm`/`md`/`lg` + `respond-to` mixin → Task 1. ✓
- Container mixin replacing repeated `max-width` → Task 1 (mixin) + Task 3 (applied to landing). ✓
- Fluid type scale + fluid layout tokens → Task 1 (defined) + Task 3 (applied). ✓
- `angular.json` `includePaths` on build target → Task 1 Step 3. ✓ (Spec mentioned test/server targets; verified jest ignores component SCSS and there is no separate `test`/`server` architect — only `build.options` needs it. Documented in Global Constraints.)
- Mobile hamburger dropdown, signal-driven, a11y contract → Task 2. ✓ (NavigationEnd realized as link-activation close — the deterministically testable equivalent; noted in Task 2 intro.)
- Retrofit app shell, landing, home, auth, not-found → Task 2 (shell) + Task 3 (pages). Not-found has no dedicated SCSS to change; it inherits global tokens and is covered by the Task 3 Step 6 visual check. ✓
- TDD the nav behavior through the public surface → Task 2 Steps 1-6. ✓
- Fluid CSS verified visually, not via CSS snapshots → Task 2 Step 8, Task 3 Step 6. ✓
- ADR + reference doc → Task 4. ✓
- Release minor, bump in PR → Task 5. ✓

**Placeholder scan:** ADR/ref doc ids are `00XX` because they are assigned by the `adr-create` skill / `./scripts/ref new` at creation time — the content to author is fully specified. No other TBD/TODO/"handle edge cases" placeholders.

**Type consistency:** `menuOpen` / `toggleMenu` / `closeMenu` / `onEscape` and the DOM selectors (`button.menu-toggle`, `#site-menu`, `aria-controls="site-menu"`, `[attr.aria-expanded]`) match between the component (Task 2 Step 3), template (Step 4), and tests (Step 1). `respond-to` / `container` mixin names and `bp.` / `layout.` namespaces match between definition (Task 1) and use (Tasks 2-3).
