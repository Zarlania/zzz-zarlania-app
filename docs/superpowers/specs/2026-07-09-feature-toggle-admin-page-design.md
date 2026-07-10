# Feature Toggle Admin Page — Design

Date: 2026-07-09
Repo: `zarlania-app` (frontend), with a companion change in `zarlania-api` (backend CORS).

## Problem

The backend `zarlania-api` now exposes an admin surface for feature toggles under
`/api/admin/feature-toggles` (hidden from the public OpenAPI, currently unauthenticated).
There is no way to exercise it from a browser. We want a frontend page to view toggles and
change them — globally and per organization — so we can confirm the toggle mechanism works
end to end. Authentication and role permissions have not landed yet, so this page is
**deliberately unprotected**; a later story locks the admin surface down.

## Backend contract (as built, `zarlania-api`)

All routes under `/api/admin/feature-toggles`; unauthenticated today.

| Method | Path | Purpose | Body | Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/admin/feature-toggles` | list all toggles | — | `FeatureToggle[]` |
| `GET` | `/api/admin/feature-toggles/{name}` | one toggle | — | `FeatureToggle` |
| `PUT` | `/api/admin/feature-toggles/{name}` | set global percentage | `{ percentage: 0–100 }` | `FeatureToggle` |
| `PUT` | `/api/admin/feature-toggles/{name}/organizations/{organizationId}` | create/replace an organization override | `{ percentage: 0–100 }` | `FeatureToggle` |
| `DELETE` | `/api/admin/feature-toggles/{name}/organizations/{organizationId}` | remove an organization override (idempotent) | — | `204 No Content` |

Data shapes:

- `FeatureToggle { name: string; percentage: number /* 0–100 */; organizationOverrides: OrganizationOverride[] }`
- `OrganizationOverride { organizationId: string /* UUID */; percentage: number /* 0–100 */ }`

Domain facts that shape the UI (see `zarlania-api` reference doc 000003):

- Percentage is not a boolean: `0` = off, `100` = on, in-between = a per-request coin flip
  (a rollout safety valve, not stable per-organization experimentation).
- Toggles are created/deleted **only** via the backend `Feature` enum — never from this UI.
  Today exactly one exists: `feature-service-canary`.
- An organization override wins unconditionally over the global percentage for that organization.
- There is **no "list organizations" endpoint**, so an organization override is identified by raw UUID.
- Backend state is wiped on every restart (in-memory H2), resetting all toggles to off.

## Scope

In scope:

- A single admin page listing every toggle, with controls to set each toggle's global
  percentage and to add / edit / remove per-organization overrides.
- A companion backend change to allow the browser to issue the `PUT`/`DELETE` writes (CORS).

Out of scope (YAGNI / not yet possible):

- Creating or deleting toggles (backend owns lifecycle via the `Feature` enum).
- Any auth / role gating — a later story protects `/admin/**`.
- Listing or searching organizations (no backend endpoint); organizations are entered as raw UUIDs.
- Persisting UI state across backend restarts.

## Route & placement

- Lazy-loaded route **`admin/feature-toggles`**, reachable only by knowing the URL.
- **No link in the public nav** — keeps the admin surface out of sight until auth lands.

## Architecture (frontend)

Feature-first, co-located under `src/app/features/admin/feature-toggles/`:

```
feature-toggle.models.ts            # FE mirrors of the backend DTOs (see below)
feature-toggle-admin.service.ts     # dedicated service; HttpClient against the admin routes
feature-toggle-admin.service.spec.ts
feature-toggles-page.component.{ts,html,scss}     # page: owns state, loading/error, renders cards
feature-toggles-page.component.spec.ts
feature-toggle-card.component.{ts,html,scss}      # presentational: one toggle
feature-toggle-card.component.spec.ts
```

Conventions followed (per `zarlania-app` CLAUDE.md): standalone components, `OnPush`,
signals for state, constructor/`inject()` injection, reactive forms for inputs.

### Models (`feature-toggle.models.ts`)

Frontend mirrors of the backend DTOs, co-located with the feature (not in the shared
`api.models.ts`, which holds identity DTOs):

- `FeatureToggle { name: string; percentage: number; organizationOverrides: OrganizationOverride[] }`
- `OrganizationOverride { organizationId: string; percentage: number }`
- `SetPercentageRequest { percentage: number }`

### Service (`FeatureToggleAdminService`)

A **dedicated** service (not an extension of the existing `ApiService`, which owns
account/POC concerns — keeps single responsibility). Same pattern as `ApiService`:
`inject(HttpClient)` + `environment.apiBaseUrl`. Methods:

- `list(): Observable<FeatureToggle[]>` → `GET /api/admin/feature-toggles`
- `setGlobalPercentage(name, percentage): Observable<FeatureToggle>` → `PUT …/{name}`
- `setOrganizationOverride(name, organizationId, percentage): Observable<FeatureToggle>` → `PUT …/{name}/organizations/{organizationId}`
- `removeOrganizationOverride(name, organizationId): Observable<void>` → `DELETE …/{name}/organizations/{organizationId}`
- `get(name): Observable<FeatureToggle>` → `GET …/{name}` (used to refresh one toggle after a delete)

### Components & data flow

**`FeatureTogglesPageComponent`** owns the data:

- On init, `GET` the list into a `toggles` signal, with `loading` and `error` signals.
- Injects the service and orchestrates every write.
- After a `PUT`, replaces that toggle in the `toggles` signal from the returned
  `FeatureToggle` body. After a `DELETE` (returns 204), re-`GET`s that one toggle to refresh.
- Uses `takeUntilDestroyed` for subscription cleanup (matching the existing `SignupComponent`).

**`FeatureToggleCardComponent`** is presentational (dumb):

- Input: one `FeatureToggle`. Outputs: `setGlobalPercentage`, `setOrganizationOverride`, `removeOrganizationOverride`
  (each carrying the payload the page needs to call the service).
- Renders:
  - toggle name + a **global control**: integer input (0–100) plus **Off** (0) / **On** (100)
    shortcut buttons.
  - existing **organization overrides** — one row each: organization UUID, its own percentage control, **Remove**.
  - an **add-override** form: organization UUID input + percentage.
- Controls are **disabled while a write is in flight** for that card; setting a percentage
  equal to the current value is a no-op.

## Validation & error handling (fail fast at the boundary)

- Percentage inputs constrained to integers **0–100**; Off/On write 0/100.
- Organization UUID validated client-side for UUID format before the add/override submit is enabled.
- Initial-load failure → error banner with a **Retry** action.
- Per-write failure → inline error on that card; the control is re-enabled.
- Empty list → an explanatory empty state (expected until toggles beyond the canary exist).

## Testing (TDD — behavior through the public surface)

- **Service**: `HttpTestingController` — each method hits the right URL, verb, and body and
  maps the response; includes the `DELETE` → 204 path.
- **Card**: render with a `FeatureToggle` input, drive the DOM (set %, click Off/On, add and
  remove an override), assert the correct outputs emit with the right payloads; assert the
  disabled-during-write behavior.
- **Page**: with a mocked service — a successful load populates cards; loading, error (with
  retry), and empty states render; a card action triggers the right service call and updates
  state (including the delete → re-fetch path).

The ≥ 80% coverage gate is enforced by the build; these tests target observable behavior, not
mock-interaction counting.

## Companion backend change (`zarlania-api`)

Without this, the page's reads work but every write is blocked by CORS preflight.

- In `WebConfig.java`, add `PUT` and `DELETE` to `allowedMethods` (currently
  `GET, POST, OPTIONS`). Update the method's explanatory comment (it currently says
  "GET reads plus POST writes") to reflect the added verbs.
- Local dev origin (`http://localhost:4200`) is supplied through the existing env override
  `ZARLANIA_CORS_ALLOWED_ORIGINS` (the allowlist is already environment-sourced via
  `CorsProperties`); no code change needed for that.
- Follow `zarlania-api` conventions: its own GitHub issue, `type/<issue#>-slug` branch, PR
  title referencing the issue, and a `chore`/`patch` version bump inside the PR. CORS behavior
  is guarded by `CorsConfigTest` — extend it (test first) to cover a `PUT`/`DELETE` preflight
  from an allowed origin. This is a config change, not an architecturally significant one, so
  no new ADR.

## Delivery

Two independent changes, each tied to its own GitHub issue per each repo's conventions:

1. `zarlania-api`: CORS methods (`chore`/`patch`). Land first so writes work.
2. `zarlania-app`: the admin page (`feature`/`minor`). Bump `package.json` in the PR.
