# AGENTS.md — Zarlania App

Instructions for **AI code reviewers** on this repo (CodeRabbit, Codex, and any
other automated reviewer). This file governs *how thoroughly and in what spirit*
to review — it does **not** define the coding standards themselves. **This is a
live, public service: merges to `master` deploy to production at
<https://zarlania.com>.** Review accordingly.

- **Source of truth is `CLAUDE.md` and the ADRs** (`docs/adrs/`). Judge changes
  against those, not against this file. This file only sets the review posture.
- **Implementers:** your entry point is `CLAUDE.md`, not this file.

## Core mandate — review as a real second pair of eyes

AI writes the code here and AI reviews it. A reviewer that assumes the implementer
got everything right adds nothing. Assume instead that the implementer may have:

- missed relevant context, or not loaded a related file before changing this one;
- overlooked an existing codebase convention, pattern, or accepted ADR;
- introduced a subtle bug, security gap, or maintainability/scalability problem.

**When in doubt, scrutinize and raise it.** A redundant flag is cheaper than a
missed defect. Verify the change — do not rubber-stamp it. If reviews prove too
noisy, that gets tuned in a later pass; the default posture is thorough, not
lenient.

## What to scrutinize

- **Correctness / bugs** — logic errors, edge cases, race conditions, wrong or
  missing error handling, broken contracts.
- **Security** — validate and sanitize/escape untrusted input at the boundary
  (XSS, unsafe DOM/HTML binding, open redirects), unsafe defaults, and
  auth/authorization gaps. Never let a secret land in a commit or the client
  bundle — anything shipped to the browser is public.
- **Maintainability** — DRY and SOLID, readability, single responsibility,
  duplication that should be refactored instead of copied. Prefer immutable data,
  signals, and constructor-injected services over mutable state.
- **Scalability / performance** — unbounded work, needless re-renders, missing
  `OnPush`/`trackBy`, leaked subscriptions, choices that won't hold as the
  codebase grows.
- **Test quality** — tests assert observable behavior through the public surface,
  not mock interactions or internals. Coverage passing does not prove a test is
  meaningful; flag meaningful gaps (untested edge cases, invariants) even when the
  ≥ 80% gate is green, and flag tests that merely game it.
- **Consistency with `CLAUDE.md` and the ADRs** — **ADRs are law.** Flag any
  change that contradicts an accepted ADR without a superseding one, or that
  violates a `CLAUDE.md` rule. If a change alters documented behavior, its
  `docs/reference/` doc must be updated in the same change — flag drift.
- **Gate integrity** — flag any newly added ESLint-disable comment, skipped or
  `.only` test, or lowered coverage threshold used to go green instead of fixing
  the root cause. A genuine tool bug needs a documented exception (issue plus a
  compensating test), not a silent suppression.
- **Release discipline** — every merge ships exactly one SemVer release. Flag a
  missing or mismatched `package.json` version bump vs. the PR's `release:<kind>`
  label (breaking = major, feature = minor, fix/chore = patch).

## Consult the authoritative sources

- **`CLAUDE.md` and accepted ADRs are law.** Query ADRs with `./scripts/adr
  list|find "<q>"|show <id>` and reference docs with `./scripts/ref list|find
  "<q>"|show <id>` — don't hand-scan `docs/`.
- Judge a change against the **ADRs and the current code**, not against any merged
  change's spec or plan — `docs/superpowers/` is frozen historical record, not a
  standard to code against.
- **Ignore `docs/ai-prompts/` entirely** — it is the user's private scratchpad,
  not documentation, and says nothing about how the code should behave.

## Severity labels

Raise every concern, and tag each with its severity so the author can triage:

- 🔴 **Critical** — bugs, security holes, data loss, or ADR violations that must
  block merge.
- 🟠 **Major** — significant maintainability, scalability, or performance problems.
- 🟡 **Minor** — smaller correctness issues or convention deviations.
- ⚪ **Nit** — style and readability preferences.

Nothing is suppressed by tier — nits still get raised, just labeled as such.

## How to raise a finding

- Be **specific and actionable**: point to the file and line, say why it matters,
  and suggest a concrete fix.
- **Cite the rule** — reference the relevant ADR or `CLAUDE.md` line when one
  applies, so the author can verify quickly.
- **If unsure, say so and flag it anyway.** Surfacing a possible issue for a human
  to confirm beats staying silent and letting it ship.
