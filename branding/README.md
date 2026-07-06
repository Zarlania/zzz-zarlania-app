# Branding master art

Source-of-truth rasters for the emblem asset pipeline (spec §7 of
`docs/superpowers/specs/2026-07-01-landing-page-and-theming-design.md`). The large
master PNGs here are **git-ignored regenerable inputs** — the derived, web-optimized
deliverables are committed under `public/` and are produced from these masters by
`docs/superpowers/plans/2026-07-02-visual-foundation-4-emblem-assets.md` Task 3.

**Emblem:** Concept A — Staff & Coiled Dragon (a dragon coiled around a gem-topped
wizard's staff, wings spread), gold on near-black.

**Two-tier by design (do not collapse):** the brand deliberately runs on two renderings
of the same emblem. A **flat two-tone crest** drives the small/functional marks (favicon,
app-icons, header logo) so they stay crisp and theme-swappable; a **detailed shaded crest**
(glowing crystal, ember accents) drives the large marketing use (`public/og-image.jpg`
social preview). These are intentionally different — when regenerating, keep `og-image.jpg`
on the detailed art; do **not** flatten it to match the icon set.

## Masters

- `mark-master.png` — the **two-tone crest** (gold wings/prongs, ember dragon body +
  crystal), square on black, matching the vector `favicon.svg` / `LogoComponent`.
  Source for `public/apple-touch-icon.png`, `public/icon-192.png`, `public/icon-512.png`.

- `og-crest.png` — the **detailed** shaded crest (glowing crystal, ember accents).
  Source for `public/og-image.jpg` (1200×630 social preview; JPEG, black-padded). This
  is the **large marketing tier** and stays detailed on purpose (see "Two-tier by design"
  above) — it is NOT the flat two-tone icon art.
  Prompt (Concept A — dark): *"A heraldic emblem of a dragon coiled around a wizard's
  staff topped with a glowing crystal, dragon and staff fused into one sigil. Flat
  vector crest style, bold clean shapes, gold and ember-orange (#eeb03a, #e2622a) on
  near-black (#15110f). Centered, symmetrical, logo mark, no text, high contrast,
  generous negative space."*

- `concept_a_favicon_source_twotone.ico` — a branded two-tone multi-resolution icon
  (16/24/32/48/64/128/256, 32-bit RGBA) matching the two-tone SVG crest, committed
  directly as `public/favicon.ico` (the legacy fallback; modern browsers use
  `favicon.svg`). No local `.ico` writer exists, so this is produced by the image
  tool, not `sips`.

## Regenerate

1. Re-run the prompts above in an image tool; drop the results here as `mark-master.png`
   (square, ≥512², the flat two-tone crest) and `og-crest.png` (≥1200×630, the detailed
   crest — keep it detailed, per "Two-tier by design").
2. Re-run Task 3's `sips` commands to rebuild the `public/` PNG icons and `og-image.jpg`.

The vector favicon (`public/favicon.svg`) and the header emblem (`LogoComponent`) share a
single two-tone vector crest (two paths: `.primary` wings/prongs, `.accent` dragon body +
crystal) that recolors via the theme tokens — they are the vectorized emblem, not derived
from these raster masters.
