# Visual Foundation 4 — Emblem & Branding Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the placeholder emblem slot into a real branding asset set — a theme-aware SVG favicon, an app-icon/PWA set, a social-preview image, and a web manifest — all wired into `index.html` and the landing page's social meta, closing spec §7 which the first three Visual-Foundation plans deferred.

**Architecture:** The header/footer emblem stays a hand-authored **inline vector** (`LogoComponent`, already built and theme-token driven) — it must theme and stay crisp at 28px, so raster art never replaces it. This plan adds its **static twin** `favicon.svg` (same path data, concrete colors, a `prefers-color-scheme` swap), a **raster icon set** derived with macOS `sips` from one user-supplied square master, an **og-image** from a user-supplied crest render, and a **web manifest**. Image *generation* is a human step (the build/agent environment has no image generator and no SVG rasterizer — verified: no `rsvg-convert`/`inkscape`/`magick`/`sharp`; only `sips` for raster resizing). So the user runs an image tool once with the spec's drafted prompts; the agent does all vectoring-by-hand, resizing, wiring, and tests.

**Tech Stack:** Angular 22 (standalone, OnPush, signals), TypeScript, Jest (`jest-preset-angular`), static assets served from `public/` via `angular.json`, macOS `sips` for raster derivation, `@angular/platform-browser` `Meta`/`Title` for social tags.

## Global Constraints

- **Angular 22.0.4**, standalone components, `ChangeDetectionStrategy.OnPush`, signal inputs — match existing code.
- **TDD, behavior-first through the public surface; ≥ 80% coverage floor** (ADR-0004). Write the failing test first every task.
- **Theme token hex values are law here** (from `src/styles.css`): dark `--color-bg #15110f`, `--color-brand #eeb03a`, `--color-action #e2622a`; light `--color-bg #f3edde`, `--color-brand #b0872a`, `--color-action #276b48`. Favicon/theme-color/manifest colors MUST use these exact values.
- **Origin** is `https://zarlania.com`; absolute URLs for all Open Graph / Twitter image tags.
- **Every change ties to issue #12** (the landing-and-theming design that owns spec §7). PR title references `#12`. Suggested branch `feat/12-emblem-assets` off `master` (or continue on `feat/12-landing-page-and-theming`).
- **No secrets in commits.** Master art is not a secret and IS committed (see Task 2) for reproducibility.
- **Never silence a gate.** Fix root causes, not `eslint-disable`/skipped tests/lowered coverage.
- **Release:** this is a feature → `release:minor` label + `./scripts/bump-version bump minor` inside the PR (see "Release & PR" at the end).

**Spec:** `docs/superpowers/specs/2026-07-01-landing-page-and-theming-design.md` §7 (emblem & branding assets) and §5 (SEO / social tags). **Deferrals this plan closes:** Plan 1 line 1061 ("final emblem art (§7) … out of scope"); Plan 2 Task 2 (social meta shipped an imageless `summary` card pending art).

**Final asset inventory (what "done" looks like in `public/`):**

| File | Source | Consumers |
|------|--------|-----------|
| `favicon.svg` (NEW) | agent hand-authored, theme-aware | primary favicon |
| `favicon.ico` (kept) | existing legacy fallback; user may replace in Task 2 | old browsers |
| `apple-touch-icon.png` 180² | `sips` ← `branding/mark-master.png` | iOS home screen |
| `icon-192.png`, `icon-512.png` | `sips` ← `branding/mark-master.png` | web manifest / PWA |
| `og-image.png` 1200×630 | `sips` ← `branding/og-crest.png` | og:image / twitter:image |
| `site.webmanifest` (NEW) | agent hand-authored JSON | PWA metadata |

---

### Task 1: Theme-aware `favicon.svg` + `index.html` wiring (agent-only, no raster)

Fully agent-doable and shippable on its own — depends on no user art. Produces the canonical small mark as a static, theme-switching SVG (the file twin of `LogoComponent`) and wires it plus `theme-color` metas into `index.html`.

**Files:**
- Create: `public/favicon.svg`
- Modify: `src/index.html` (add SVG-favicon link + two `theme-color` metas; keep the existing `favicon.ico` link)
- Test: `src/app/branding-assets.spec.ts` (NEW — parallels `src/app/seo-assets.spec.ts`)

**Interfaces:**
- Consumes: path data from `src/app/shared/logo/logo.component.ts` (the four `<path>`/`<line>` `d=` values) — reuse them so the favicon and header mark stay the same silhouette.
- Produces: `public/favicon.svg` (viewBox `0 0 64 64`, class-based fills, a `prefers-color-scheme: light` block); `index.html` containing `<link rel="icon" type="image/svg+xml" href="favicon.svg" />` and `<meta name="theme-color" …>` for both schemes. Later tasks add `apple-touch-icon` and `manifest` links to the same `<head>`.

- [ ] **Step 1: Write the failing test**

Create `src/app/branding-assets.spec.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const publicDir = join(__dirname, '..', '..', 'public');
const indexHtml = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');

describe('favicon.svg (theme-aware vector mark)', () => {
  const svg = readFileSync(join(publicDir, 'favicon.svg'), 'utf8');

  it('is a 64x64 viewBox SVG', () => {
    expect(svg).toContain('viewBox="0 0 64 64"');
  });

  it('carries the dark-theme brand and action colors', () => {
    expect(svg).toContain('#eeb03a'); // --color-brand (dark)
    expect(svg).toContain('#e2622a'); // --color-action (dark)
  });

  it('swaps to the light-theme palette under prefers-color-scheme: light', () => {
    expect(svg).toContain('prefers-color-scheme: light');
    expect(svg).toContain('#b0872a'); // --color-brand (light)
    expect(svg).toContain('#276b48'); // --color-action (light)
  });
});

describe('index.html branding wiring', () => {
  it('links the SVG favicon as the primary icon', () => {
    expect(indexHtml).toContain('<link rel="icon" type="image/svg+xml" href="favicon.svg"');
  });

  it('keeps the .ico as a legacy fallback', () => {
    expect(indexHtml).toContain('href="favicon.ico"');
  });

  it('sets a theme-color for each color scheme using the real bg tokens', () => {
    expect(indexHtml).toContain('name="theme-color"');
    expect(indexHtml).toContain('content="#15110f" media="(prefers-color-scheme: dark)"');
    expect(indexHtml).toContain('content="#f3edde" media="(prefers-color-scheme: light)"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/branding-assets.spec.ts`
Expected: FAIL — `ENOENT` on `public/favicon.svg` (and the index.html assertions would fail once that's past).

- [ ] **Step 3: Create `public/favicon.svg`**

Class-based fills (CSS `fill`/`stroke` resolve reliably in SVG favicons; presentation-attribute `var()` does not). Path data mirrors `LogoComponent`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="Zarlania">
  <style>
    .brand { fill: #eeb03a; stroke: #eeb03a; }
    .action { fill: #e2622a; stroke: #e2622a; }
    @media (prefers-color-scheme: light) {
      .brand { fill: #b0872a; stroke: #b0872a; }
      .action { fill: #276b48; stroke: #276b48; }
    }
  </style>
  <path class="brand" d="M32 5 L38 12 L32 20 L26 12 Z" />
  <line class="brand" x1="32" y1="21" x2="32" y2="57" fill="none" stroke-width="3.4" stroke-linecap="round" />
  <path class="action" d="M30 55 C 21 55 21 47 30 47 C 41 47 41 37 30 37 C 20 37 20 28 31 27" fill="none" stroke-width="3.6" stroke-linecap="round" />
  <path class="action" d="M31 27 C 30 22 33 18.5 38 19 L35 22 L40.5 22.5 C 39 26.5 34 28 31 27 Z" stroke="none" />
</svg>
```

- [ ] **Step 4: Wire `index.html`**

In `src/index.html`, replace the single icon line (currently `<link rel="icon" type="image/x-icon" href="favicon.ico" />`) with the SVG-primary + ico-fallback pair, and add the two `theme-color` metas immediately after. The new `<head>` block reads:

```html
    <link rel="icon" type="image/svg+xml" href="favicon.svg" />
    <link rel="icon" type="image/x-icon" href="favicon.ico" />
    <meta name="theme-color" content="#15110f" media="(prefers-color-scheme: dark)" />
    <meta name="theme-color" content="#f3edde" media="(prefers-color-scheme: light)" />
```

Leave the no-flash `<script>` untouched.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/app/branding-assets.spec.ts`
Expected: PASS (6 assertions across two describes).

- [ ] **Step 6: Commit**

```bash
git add public/favicon.svg src/index.html src/app/branding-assets.spec.ts
git commit -m "feat: add theme-aware SVG favicon and index.html icon/theme-color wiring (#12)"
```

---

### Task 2: User hand-off — generate & commit master branding art

The one step the agent cannot do: run an image tool. This task surfaces the spec's drafted prompts, the user produces raster masters, and we commit them as the reproducible source for Task 3. **This is a human checkpoint** — an executing subagent should stop here and hand these prompts to the user, then resume once the files exist.

**Files:**
- Create (user-supplied, committed): `branding/mark-master.png`, `branding/og-crest.png`
- Create (optional, user-supplied): `branding/favicon-source.ico` → if provided, copied over `public/favicon.ico`
- Create: `branding/README.md` (records which concept/prompts produced each master)

**Interfaces:**
- Produces: `branding/mark-master.png` — the **simplified mark**, square, **≥ 512×512**, on the dark bg `#15110f` (so downscaled icons have correct padding/contrast). `branding/og-crest.png` — the **detailed crest**, landscape-ish, **≥ 1200×630** (any size ≥ that; Task 3 pads/downscales to exact). Task 3 consumes both by these exact paths.

- [ ] **Step 1: Present the prompts to the user (verbatim from spec §7)**

Ask the user to run their image tool and produce **two** rasters. Choose **one** crest concept for `og-crest.png`:

*Concept A — dark (Staff & Coiled Dragon):* "A heraldic emblem of a dragon coiled around a wizard's staff topped with a glowing crystal, dragon and staff fused into one sigil. Flat vector crest style, bold clean shapes, gold and ember-orange (#eeb03a, #e2622a) on near-black (#15110f). Centered, symmetrical, logo mark, no text, high contrast, generous negative space."

*Concept C — dark (Dragon Roundel):* "A circular heraldic medallion: a dragon curled around a central faceted gem that doubles as a wizard's staff crystal, ring border with small rune ticks. Flat vector crest, gold and ember-orange (#eeb03a, #e2622a) on near-black (#15110f), app-icon composition, no text, symmetrical, high contrast."

For `mark-master.png` (the square icon source):

*Simplified favicon (either concept):* "A minimal single-color silhouette version of the mark, extremely simple, readable at 16px, bold shapes only, no fine detail." — rendered on a solid `#15110f` background, square.

(Light-theme crest variants exist in the spec if a light social image is ever wanted; not needed for this plan — the SVG favicon already handles light theme, and one og-image is enough.)

- [ ] **Step 2: User drops the files and (optionally) a branded `.ico`**

User saves `branding/mark-master.png` and `branding/og-crest.png`. If they also export a multi-resolution `.ico` from their tool, save it as `branding/favicon-source.ico`.

- [ ] **Step 3: Verify the masters meet the size floor**

Run:

```bash
sips -g pixelWidth -g pixelHeight branding/mark-master.png branding/og-crest.png
```

Expected: `mark-master.png` is square and ≥ 512 on each side; `og-crest.png` is ≥ 1200 wide and ≥ 630 tall. If not, ask the user to re-export larger before continuing (downscaling is lossless-enough; upscaling is not).

- [ ] **Step 4: If a branded `.ico` was provided, adopt it**

```bash
[ -f branding/favicon-source.ico ] && cp branding/favicon-source.ico public/favicon.ico || echo "keeping existing favicon.ico fallback"
```

- [ ] **Step 5: Record provenance**

Create `branding/README.md`:

```markdown
# Branding master art

Source-of-truth rasters for the emblem asset pipeline (spec §7). Derived,
web-optimized files live in `public/` and are produced from these by
`docs/superpowers/plans/2026-07-02-visual-foundation-4-emblem-assets.md` Task 3.

- `mark-master.png` — simplified single-color mark, square, on #15110f. Source for
  `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`. Prompt: "Simplified favicon".
- `og-crest.png` — detailed crest. Source for `og-image.png`. Concept: <A or C> — dark.
- `favicon-source.ico` (optional) — branded multi-res icon copied to `public/favicon.ico`.

Regenerate `public/` outputs by re-running Task 3's `sips` commands.
```

(Fill `<A or C>` with the concept the user picked.)

- [ ] **Step 6: Commit the masters**

```bash
git add branding/ public/favicon.ico
git commit -m "chore: add master branding art from image-gen hand-off (#12)"
```

---

### Task 3: Derive the raster icon set + web manifest via `sips` (agent)

From the committed masters, produce the web-optimized PNGs and the manifest, and wire the remaining `<head>` links. Gated on Task 2's files existing.

**Files:**
- Create: `public/apple-touch-icon.png`, `public/icon-192.png`, `public/icon-512.png`, `public/og-image.png`, `public/site.webmanifest`
- Modify: `src/index.html` (add `apple-touch-icon` + `manifest` links)
- Test: `src/app/branding-assets.spec.ts` (append `describe`s — tool-free PNG size parsing + manifest JSON checks + index wiring)

**Interfaces:**
- Consumes: `branding/mark-master.png`, `branding/og-crest.png` (Task 2).
- Produces: `public/apple-touch-icon.png` (180×180), `public/icon-192.png` (192²), `public/icon-512.png` (512²), `public/og-image.png` (1200×630), `public/site.webmanifest` (JSON with `name`, `short_name`, `theme_color: "#15110f"`, `background_color: "#15110f"`, `display: "standalone"`, `icons` referencing the 192 & 512 PNGs). Task 4 consumes `og-image.png` at URL `https://zarlania.com/og-image.png`.

- [ ] **Step 1: Write the failing tests**

Append to `src/app/branding-assets.spec.ts`:

```ts
// PNG size without any external tool: 8-byte signature, then IHDR whose
// width is a big-endian uint32 at byte 16 and height at byte 20.
function pngSize(file: string): { width: number; height: number } {
  const b = readFileSync(join(publicDir, file));
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

describe('raster icon set', () => {
  it('apple-touch-icon is 180x180', () => {
    expect(pngSize('apple-touch-icon.png')).toEqual({ width: 180, height: 180 });
  });

  it('manifest icons are 192 and 512 square', () => {
    expect(pngSize('icon-192.png')).toEqual({ width: 192, height: 192 });
    expect(pngSize('icon-512.png')).toEqual({ width: 512, height: 512 });
  });

  it('og-image is the standard 1200x630 social size', () => {
    expect(pngSize('og-image.png')).toEqual({ width: 1200, height: 630 });
  });
});

describe('site.webmanifest', () => {
  const manifest = JSON.parse(readFileSync(join(publicDir, 'site.webmanifest'), 'utf8'));

  it('names the app and sets brand-consistent colors', () => {
    expect(manifest.name).toBe('Zarlania');
    expect(manifest.theme_color).toBe('#15110f');
    expect(manifest.background_color).toBe('#15110f');
    expect(manifest.display).toBe('standalone');
  });

  it('references the 192 and 512 icons', () => {
    const srcs = manifest.icons.map((i: { src: string }) => i.src);
    expect(srcs).toContain('icon-192.png');
    expect(srcs).toContain('icon-512.png');
  });
});

describe('index.html icon/manifest wiring', () => {
  it('links the apple-touch-icon and the web manifest', () => {
    expect(indexHtml).toContain('<link rel="apple-touch-icon" href="apple-touch-icon.png"');
    expect(indexHtml).toContain('<link rel="manifest" href="site.webmanifest"');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/app/branding-assets.spec.ts`
Expected: FAIL — `ENOENT` on the PNGs / manifest.

- [ ] **Step 3: Derive the square icons from the mark master**

`sips -z` takes height then width; masters are square so this is a clean downscale:

```bash
sips -z 180 180 branding/mark-master.png --out public/apple-touch-icon.png
sips -z 192 192 branding/mark-master.png --out public/icon-192.png
sips -z 512 512 branding/mark-master.png --out public/icon-512.png
```

- [ ] **Step 4: Derive the 1200×630 og-image from the crest**

Downscale the longest side to fit, then pad to the exact social canvas with the dark bg so nothing is stretched:

```bash
sips --resampleHeightWidthMax 1200 branding/og-crest.png --out /tmp/og-sized.png
sips --padToHeightWidth 630 1200 --padColor 15110F /tmp/og-sized.png --out public/og-image.png
```

Verify the result is exactly 1200×630:

```bash
sips -g pixelWidth -g pixelHeight public/og-image.png
```

Expected: `pixelWidth: 1200`, `pixelHeight: 630`. (If the crest was portrait and padding produced a different box, re-run step 4 with the crest downscaled to width 1200 first — the pad step then only adds top/bottom bars.)

- [ ] **Step 5: Author `public/site.webmanifest`**

```json
{
  "name": "Zarlania",
  "short_name": "Zarlania",
  "description": "Catalog, index, and track the value of your card collections in one vault.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#15110f",
  "theme_color": "#15110f",
  "icons": [
    { "src": "icon-192.png", "type": "image/png", "sizes": "192x192" },
    { "src": "icon-512.png", "type": "image/png", "sizes": "512x512" }
  ]
}
```

- [ ] **Step 6: Wire the remaining `<head>` links in `index.html`**

Add, directly after the two `theme-color` metas from Task 1:

```html
    <link rel="apple-touch-icon" href="apple-touch-icon.png" />
    <link rel="manifest" href="site.webmanifest" />
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx jest src/app/branding-assets.spec.ts`
Expected: PASS (all describes green).

- [ ] **Step 8: Commit**

```bash
git add public/apple-touch-icon.png public/icon-192.png public/icon-512.png public/og-image.png public/site.webmanifest src/index.html src/app/branding-assets.spec.ts
git commit -m "feat: derive app-icon set, og-image, and web manifest from master art (#12)"
```

---

### Task 4: Enable the image social card on the landing page (agent)

Now that `og-image.png` exists, upgrade the landing's social meta from the imageless `summary` card (Plan 2's deliberate interim) to a full `summary_large_image` card with Open Graph and Twitter image tags. Gated on Task 3.

**Files:**
- Modify: `src/app/features/landing/landing.component.ts` (constructor meta block, ~lines 220–231; add an `OG_IMAGE` constant near the other `static readonly`s ~lines 212–215)
- Test: `src/app/features/landing/landing.component.spec.ts` (the existing "sets description and social meta tags" test, ~lines 54–72)

**Interfaces:**
- Consumes: `public/og-image.png` (Task 3), served at `https://zarlania.com/og-image.png`.
- Produces: no new public symbols — updates the rendered `<meta>` set. `LandingComponent` gains a `private static readonly OG_IMAGE = 'https://zarlania.com/og-image.png'`.

- [ ] **Step 1: Update the failing test**

In `src/app/features/landing/landing.component.spec.ts`, change the twitter-card assertion and add image assertions inside the existing "sets description and social meta tags" `it`:

```ts
    expect(meta.getTag('name="twitter:card"')?.content).toBe('summary_large_image');
    expect(meta.getTag('property="og:image"')?.content).toBe('https://zarlania.com/og-image.png');
    expect(meta.getTag('property="og:image:width"')?.content).toBe('1200');
    expect(meta.getTag('property="og:image:height"')?.content).toBe('630');
    expect(meta.getTag('name="twitter:image"')?.content).toBe('https://zarlania.com/og-image.png');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/features/landing/landing.component.spec.ts -t "social meta"`
Expected: FAIL — `twitter:card` is still `summary`; `og:image` tag is `undefined`.

- [ ] **Step 3: Update the component**

In `src/app/features/landing/landing.component.ts`, add the constant beside the others:

```ts
  private static readonly ORIGIN = 'https://zarlania.com';
  private static readonly OG_IMAGE = `${LandingComponent.ORIGIN}/og-image.png`;
```

Replace the interim comment + `twitter:card` line and extend the block so the constructor's social tags read:

```ts
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: LandingComponent.ORIGIN });
    this.meta.updateTag({ property: 'og:image', content: LandingComponent.OG_IMAGE });
    this.meta.updateTag({ property: 'og:image:width', content: '1200' });
    this.meta.updateTag({ property: 'og:image:height', content: '630' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: LandingComponent.TITLE });
    this.meta.updateTag({ name: 'twitter:description', content: LandingComponent.DESCRIPTION });
    this.meta.updateTag({ name: 'twitter:image', content: LandingComponent.OG_IMAGE });
```

(Delete the two-line "imageless card" comment — it no longer applies.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/app/features/landing/landing.component.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/landing/landing.component.ts src/app/features/landing/landing.component.spec.ts
git commit -m "feat: use the large-image social card with the branded og-image (#12)"
```

---

## Full-suite verification (after Task 4)

- [ ] Run the whole suite with coverage: `npm run test:ci`
      Expected: all green, coverage ≥ 80% (new SVG/JSON/PNG assets add no uncovered TS branches; the only new TS is `LandingComponent`'s constants, exercised by the meta test).
- [ ] Prerender/build succeeds and copies assets: `npm run build`
      Expected: `dist/zarlania-app/browser/` contains `favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `og-image.png`, `site.webmanifest`, and the prerendered `index.html` `<head>` shows all icon/manifest/theme-color links and the `og:image`/`twitter:image` tags baked in.
- [ ] Optional manual check: `npm start`, open the app, confirm the tab shows the new favicon in both OS light and dark mode, and paste `https://zarlania.com` into a link-preview debugger (or view `<head>`) to confirm the large image card.

## Spec §7 coverage self-check

- Two-tier by design (detailed crest + simplified mark) → crest = `og-image.png` (Task 3), simplified mark = `LogoComponent` + `favicon.svg` (existing + Task 1). ✓
- Pipeline step 1 "Generate … user runs an image tool" → Task 2 hand-off with verbatim prompts. ✓
- Step 2 "Vectorize/clean … simplified mark" → `favicon.svg` hand-authored from the mark (Task 1); raster icons `sips`-derived (Task 3). ✓
- Step 3 favicon set (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png` 180, og-image) + `index.html` + web manifest wired → Tasks 1 & 3. ✓
- Step 4 placeholder until final art → `LogoComponent` stays the canonical vector mark (unchanged); its static twin `favicon.svg` now ships. ✓
- SEO §5 OG/Twitter image tags for link previews → Task 4. ✓

**Known environment limitation (documented, not silenced):** no SVG rasterizer or `.ico` writer is available, so a *newly branded* `favicon.ico` (16/32) can only come from the user's tool (Task 2, optional). Until then the existing `favicon.ico` remains a valid non-broken fallback and `favicon.svg` is the primary icon every modern browser uses. If a branded `.ico` is later required and no tool is installed, that is a one-line follow-up issue, not a gate to disable.

## Release & PR

1. Apply the `release:minor` label (new user-facing branding feature).
2. `./scripts/bump-version bump minor` — sets `package.json` to the next minor.
3. Open the PR with a title referencing `#12`; CI's "Release version bump" check verifies the bump against the label.
4. No new ADR: this plan implements decisions already recorded in the §7 spec and the existing theming/token ADRs; it introduces no architecturally significant new choice.
