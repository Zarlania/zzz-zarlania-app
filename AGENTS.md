# AGENTS.md — Zarlania App

Instructions for **AI code reviewers** on this repo (CodeRabbit, Codex, and any
other automated reviewer). This file governs *how thoroughly and in what spirit*
to review — it does **not** define the coding standards themselves.

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
- **Security** — input validation at boundaries, injection, secret exposure,
  unsafe defaults, auth/authorization gaps. Never let a secret land in a commit.
- **Maintainability** — DRY and SOLID, readability, single responsibility,
  duplication that should be refactored instead of copied.
- **Scalability / performance** — unbounded work, needless re-renders, N+1
  patterns, choices that won't hold as the codebase grows.
- **Test quality** — tests assert observable behavior through the public surface,
  not mock interactions or internals. Coverage passing does not prove a test is
  meaningful; flag tests that game the gate.
- **Consistency with `CLAUDE.md` and the ADRs** — **ADRs are law.** Flag any
  change that contradicts an accepted ADR without a superseding one, or that
  violates a `CLAUDE.md` rule.

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
