# Branding master art

Source-of-truth rasters for the emblem asset pipeline (spec §7 of
`docs/superpowers/specs/2026-07-01-landing-page-and-theming-design.md`). The large
master PNGs here are **git-ignored regenerable inputs** — the derived, web-optimized
deliverables are committed under `public/` and are produced from these masters by
`docs/superpowers/plans/2026-07-02-visual-foundation-4-emblem-assets.md` Task 3.

**Emblem:** Concept A — Staff & Coiled Dragon (a dragon coiled around a gem-topped
wizard's staff, wings spread), gold on near-black.

## Masters

- `mark-master.png` — the **simplified / flat** single-color mark, square, gold on
  black. Source for `public/apple-touch-icon.png`, `public/icon-192.png`,
  `public/icon-512.png`.
  Prompt: *"A minimal single-color silhouette version of the mark, extremely simple,
  readable at 16px, bold shapes only, no fine detail."* (rendered square on #15110f)

- `og-crest.png` — the **detailed** shaded crest (glowing crystal, ember accents).
  Source for `public/og-image.png` (social preview).
  Prompt (Concept A — dark): *"A heraldic emblem of a dragon coiled around a wizard's
  staff topped with a glowing crystal, dragon and staff fused into one sigil. Flat
  vector crest style, bold clean shapes, gold and ember-orange (#eeb03a, #e2622a) on
  near-black (#15110f). Centered, symmetrical, logo mark, no text, high contrast,
  generous negative space."*

## Regenerate

1. Re-run the prompts above in an image tool; drop the results here as `mark-master.png`
   (square, ≥512²) and `og-crest.png` (≥1200×630).
2. Re-run Task 3's `sips` commands to rebuild the `public/` outputs.

The theme-aware vector favicon (`public/favicon.svg`) and the header emblem
(`LogoComponent`) are hand-authored SVGs, not derived from these masters.
