# Design: `AGENTS.md` — Reviewer Mandate for AI Code Review

**Date:** 2026-07-06
**Status:** Approved (design phase)

## Problem

CodeRabbit and Codex both run AI code reviews on this repo. Their review
granularity is currently undefined, so coverage is inconsistent. Because AI both
*writes* and *reviews* the code here, a reviewer that assumes the implementer got
everything right adds little value. We want reviewers to act as a genuine second
pair of eyes: nitpicky, thorough, and skeptical of the change in front of them.

## Goal

Author a single root-level `AGENTS.md` that establishes the *spirit and
granularity* of AI reviews — not the coding standards themselves, which already
live in `CLAUDE.md` and the ADRs.

## Non-negotiable framing

- **Source of truth stays in `CLAUDE.md` + ADRs.** `AGENTS.md` governs *how* to
  review, not *what* the standards are. It links back rather than restating, to
  stay DRY.
- **Codex reads `AGENTS.md` natively; CodeRabbit reads the prose where it can.**
  CodeRabbit's assertiveness dials (review profile, nitpick toggles) live in
  `.coderabbit.yaml`, which is **out of scope** for this change (deferred to a
  later pass).

## The reviewer mandate (core philosophy)

AI writes the code and AI reviews the code. Therefore the reviewer must assume the
implementer may have:

- missed relevant context or not loaded a related file,
- overlooked an existing codebase convention or ADR,
- introduced a subtle bug, security gap, or maintainability/scalability problem.

**When in doubt, scrutinize and raise it.** A redundant flag is cheaper than a
missed defect. If reviews prove too noisy, that gets tuned in later passes — the
default posture is thorough, not lenient.

## Structure of `AGENTS.md`

Root-level, terse and imperative (matching `CLAUDE.md`'s voice), ~1 page:

1. **Purpose & audience** — Instructs AI reviewers (CodeRabbit, Codex). Standards
   live in `CLAUDE.md` + ADRs; this file governs review thoroughness and spirit.
   Implementers are pointed back to `CLAUDE.md`.
2. **Core mandate** — The philosophy above: assume the implementer missed
   something; verify, don't rubber-stamp; when in doubt, flag.
3. **What to scrutinize** — Focus areas as tight bullets (not restatements):
   - Correctness / bugs
   - Security
   - Maintainability (DRY, SOLID, readability)
   - Scalability / performance
   - Test quality (behavior over mocks/internals)
   - Consistency with ADRs & `CLAUDE.md` ("ADRs are law" — flag contradictions)
4. **Severity labels** — Every concern is raised and tagged:
   - 🔴 **Critical** — bugs, security holes, data loss, ADR violations that must
     block merge.
   - 🟠 **Major** — significant maintainability/scalability/perf problems.
   - 🟡 **Minor** — smaller correctness or convention issues.
   - ⚪ **Nit** — style/readability preferences.
   Full coverage plus easy triage; nothing is suppressed by tier.
5. **How to raise a finding** — Be specific and actionable (file/line, why it
   matters, suggested fix); cite the relevant ADR/`CLAUDE.md` rule when one
   applies; if unsure, say so and flag anyway rather than stay silent.

## Out of scope

- `.coderabbit.yaml` and CodeRabbit's numeric dials (deferred).
- Any change to `CLAUDE.md`, the ADRs, or coding standards.
- Any change to implementer behavior.

## Verification

- `AGENTS.md` passes the repo's `markdownlint` config (root `.md`, same
  pre-commit gate as `CLAUDE.md`).
- Content is DRY against `CLAUDE.md` — no duplicated standards, only references.
