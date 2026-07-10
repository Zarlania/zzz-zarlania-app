# Feature Toggle Admin Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an unlinked `/admin/feature-toggles` page that lists feature toggles and lets an operator set each toggle's global percentage and add/edit/remove per-organization overrides, against the `zarlania-api` admin surface.

**Architecture:** A dedicated `FeatureToggleAdminService` wraps the `/api/admin/feature-toggles` HTTP surface. A container `FeatureTogglesPageComponent` owns all state (list, loading, per-toggle pending/error signals) and orchestrates every write; a presentational `FeatureToggleCardComponent` renders one toggle via signal inputs and emits action outputs. A one-time companion change in `zarlania-api` adds `PUT`/`DELETE` to the CORS allowed methods so browser writes are not blocked at preflight.

**Tech Stack:** Angular 22 (standalone components, `OnPush`, signal `input()`/`output()`, reactive forms), TypeScript 6, RxJS 7, Jest + `@angular/common/http/testing`. Backend: Java 25 / Spring Boot 4.1 / Maven.

## Global Constraints

- **Two repos, two issues, two PRs.** Backend change is `zarlania-api` issue **#70**; frontend change is `zarlania-app` issue **#39** on branch `feat/39-feature-toggle-admin-page` (already created).
- **No abbreviated names.** Spell identifiers and prose in full: `organization` not `org`, `organizationId` not `orgId`. (Backend DTOs already do: `organizationId`.)
- **Percentage is an integer 0–100.** `0` = off, `100` = on. Validate at the boundary.
- **TDD.** Write the failing test first; assert observable behavior through the public surface (DOM / HTTP), never mock-interaction internals.
- **Coverage gate ≥ 80%** and lint/format are enforced by the build — do not silence them.
- **No auth.** The page is deliberately unprotected and unlinked from nav; a later story locks `/admin/**` down.
- **Backend lands first** so the frontend writes work end to end.
- **Every merge ships one SemVer release**, bumped inside the PR: `zarlania-api` = `patch` (`release:patch`), `zarlania-app` = `minor` (`release:minor`).

---

### Task 1: Backend — allow PUT/DELETE cross-origin (`zarlania-api`)

**Repo:** `~/workspace/zarlania-api` (separate from the frontend). Follows `zarlania-api` CLAUDE.md conventions.

**Files:**
- Modify: `src/main/java/com/zarlania/api/config/WebConfig.java`
- Test: `src/test/java/com/zarlania/api/config/CorsConfigTest.java`
- Modify: `pom.xml` (`<version>`)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: cross-origin `PUT` and `DELETE` are allowed for the frontend origin, unblocking the writes the frontend service issues in Task 2. No code symbol is shared across repos.

- [ ] **Step 1: Branch off master for issue #70**

```bash
cd ~/workspace/zarlania-api
git checkout master && git pull
git checkout -b chore/70-cors-allow-put-delete
```

- [ ] **Step 2: Write the failing preflight tests**

Add these two tests to `CorsConfigTest` (class already exists; keep the existing tests). They model the real browser preflight for the toggle writes — a `PUT` to set a percentage and a `DELETE` to remove an override:

```java
  @Test
  void allowedOriginPutPreflightSucceeds() throws Exception {
    mockMvc()
        .perform(
            options("/api/admin/feature-toggles/feature-service-canary")
                .header("Origin", "https://zarlania.com")
                .header("Access-Control-Request-Method", "PUT")
                .header("Access-Control-Request-Headers", "content-type"))
        .andExpect(status().isOk())
        .andExpect(header().string("Access-Control-Allow-Origin", "https://zarlania.com"))
        .andExpect(header().string("Access-Control-Allow-Methods", containsString("PUT")))
        .andExpect(
            header()
                .string(
                    "Access-Control-Allow-Headers", containsStringIgnoringCase("content-type")));
  }

  @Test
  void allowedOriginDeletePreflightSucceeds() throws Exception {
    mockMvc()
        .perform(
            options(
                    "/api/admin/feature-toggles/feature-service-canary/organizations/"
                        + "11111111-1111-1111-1111-111111111111")
                .header("Origin", "https://zarlania.com")
                .header("Access-Control-Request-Method", "DELETE"))
        .andExpect(status().isOk())
        .andExpect(header().string("Access-Control-Allow-Origin", "https://zarlania.com"))
        .andExpect(header().string("Access-Control-Allow-Methods", containsString("DELETE")));
  }
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd ~/workspace/zarlania-api && ./mvnw -q -Dtest=CorsConfigTest test`
Expected: FAIL — the preflight responses omit `PUT`/`DELETE` from `Access-Control-Allow-Methods` (status may be 403 for the disallowed method).

- [ ] **Step 4: Add PUT and DELETE to the allowed methods**

In `WebConfig.java`, change the `allowedMethods(...)` line and update the explanatory comment. Replace:

```java
    // NOTE: FindSecBugs' CorsRegistryCORSDetector cannot analyze this method — it NPEs on the
    // config-sourced String[] of origins (see issue #23), so PERMISSIVE_CORS is not statically
    // checked here. CORS behavior is guarded by CorsConfigTest (allowed/disallowed origin +
    // preflight) instead. Methods/headers are scoped to the current API surface: GET reads plus
    // POST writes (e.g. POST /accounts).
    registry
        .addMapping("/**")
        .allowedOrigins(cors.allowedOrigins().toArray(String[]::new))
        .allowedMethods("GET", "POST", "OPTIONS")
        .allowedHeaders("Content-Type", "Accept");
```

with:

```java
    // NOTE: FindSecBugs' CorsRegistryCORSDetector cannot analyze this method — it NPEs on the
    // config-sourced String[] of origins (see issue #23), so PERMISSIVE_CORS is not statically
    // checked here. CORS behavior is guarded by CorsConfigTest (allowed/disallowed origin +
    // preflight) instead. Methods/headers are scoped to the current API surface: GET reads plus
    // POST/PUT/DELETE writes (e.g. POST /accounts, and the PUT/DELETE admin feature-toggle
    // endpoints under /api/admin/feature-toggles).
    registry
        .addMapping("/**")
        .allowedOrigins(cors.allowedOrigins().toArray(String[]::new))
        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
        .allowedHeaders("Content-Type", "Accept");
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd ~/workspace/zarlania-api && ./mvnw -q -Dtest=CorsConfigTest test`
Expected: PASS — all CORS tests green, including the new `PUT`/`DELETE` preflight tests.

- [ ] **Step 6: Bump the version (patch)**

Run: `cd ~/workspace/zarlania-api && ./scripts/bump-version bump patch`
Expected: `pom.xml` `<version>` advances by one patch (e.g. `4.1.0` → `4.1.1`).

- [ ] **Step 7: Commit**

```bash
cd ~/workspace/zarlania-api
git add src/main/java/com/zarlania/api/config/WebConfig.java \
        src/test/java/com/zarlania/api/config/CorsConfigTest.java pom.xml
git commit -m "chore: allow PUT/DELETE cross-origin for admin toggle writes (#70)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 8: Push and open the PR (label `release:patch`)**

```bash
cd ~/workspace/zarlania-api
git push -u origin chore/70-cors-allow-put-delete
gh pr create --fill --label release:patch \
  --title "chore: allow PUT/DELETE cross-origin for admin toggle writes (#70)"
```

Merge this PR before shipping the frontend so the writes work in production. (For local dev, run the API with `ZARLANIA_CORS_ALLOWED_ORIGINS=http://localhost:4200` — no code change needed.)

---

### Task 2: Frontend — models + `FeatureToggleAdminService` (`zarlania-app`)

**Repo:** `~/workspace/zarlania-app`, branch `feat/39-feature-toggle-admin-page` (already checked out).

**Files:**
- Create: `src/app/features/admin/feature-toggles/feature-toggle.models.ts`
- Create: `src/app/features/admin/feature-toggles/feature-toggle-admin.service.ts`
- Test: `src/app/features/admin/feature-toggles/feature-toggle-admin.service.spec.ts`

**Interfaces:**
- Consumes: `environment.apiBaseUrl` from `src/environments/environment`.
- Produces (relied on by Tasks 3 & 4):
  - `interface OrganizationOverride { organizationId: string; percentage: number }`
  - `interface FeatureToggle { name: string; percentage: number; organizationOverrides: OrganizationOverride[] }`
  - `interface SetPercentageRequest { percentage: number }`
  - `class FeatureToggleAdminService` with:
    - `list(): Observable<FeatureToggle[]>`
    - `get(name: string): Observable<FeatureToggle>`
    - `setGlobalPercentage(name: string, percentage: number): Observable<FeatureToggle>`
    - `setOrganizationOverride(name: string, organizationId: string, percentage: number): Observable<FeatureToggle>`
    - `removeOrganizationOverride(name: string, organizationId: string): Observable<void>`

- [ ] **Step 1: Create the models file**

Create `src/app/features/admin/feature-toggles/feature-toggle.models.ts`:

```ts
/** Frontend mirrors of the backend admin feature-toggle DTOs (/api/admin/feature-toggles). */

export interface OrganizationOverride {
  organizationId: string;
  percentage: number;
}

export interface FeatureToggle {
  name: string;
  percentage: number;
  organizationOverrides: OrganizationOverride[];
}

export interface SetPercentageRequest {
  percentage: number;
}
```

- [ ] **Step 2: Write the failing service tests**

Create `src/app/features/admin/feature-toggles/feature-toggle-admin.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FeatureToggleAdminService } from './feature-toggle-admin.service';
import { FeatureToggle } from './feature-toggle.models';
import { environment } from '../../../../environments/environment';

const base = `${environment.apiBaseUrl}/api/admin/feature-toggles`;
const canary: FeatureToggle = {
  name: 'feature-service-canary',
  percentage: 0,
  organizationOverrides: [],
};
const organizationId = '11111111-1111-1111-1111-111111111111';

describe('FeatureToggleAdminService', () => {
  let service: FeatureToggleAdminService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    service = TestBed.inject(FeatureToggleAdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs the toggle list', () => {
    let result: FeatureToggle[] | undefined;
    service.list().subscribe((toggles) => (result = toggles));
    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush([canary]);
    expect(result).toEqual([canary]);
  });

  it('GETs a single toggle by name', () => {
    let result: FeatureToggle | undefined;
    service.get('feature-service-canary').subscribe((toggle) => (result = toggle));
    const req = httpMock.expectOne(`${base}/feature-service-canary`);
    expect(req.request.method).toBe('GET');
    req.flush(canary);
    expect(result).toEqual(canary);
  });

  it('PUTs the global percentage and returns the updated toggle', () => {
    let result: FeatureToggle | undefined;
    service.setGlobalPercentage('feature-service-canary', 100).subscribe((t) => (result = t));
    const req = httpMock.expectOne(`${base}/feature-service-canary`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ percentage: 100 });
    req.flush({ ...canary, percentage: 100 });
    expect(result).toEqual({ ...canary, percentage: 100 });
  });

  it('PUTs an organization override and returns the updated toggle', () => {
    const updated: FeatureToggle = {
      ...canary,
      organizationOverrides: [{ organizationId, percentage: 50 }],
    };
    let result: FeatureToggle | undefined;
    service
      .setOrganizationOverride('feature-service-canary', organizationId, 50)
      .subscribe((t) => (result = t));
    const req = httpMock.expectOne(`${base}/feature-service-canary/organizations/${organizationId}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ percentage: 50 });
    req.flush(updated);
    expect(result).toEqual(updated);
  });

  it('DELETEs an organization override', () => {
    let completed = false;
    service
      .removeOrganizationOverride('feature-service-canary', organizationId)
      .subscribe(() => (completed = true));
    const req = httpMock.expectOne(`${base}/feature-service-canary/organizations/${organizationId}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(completed).toBe(true);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd ~/workspace/zarlania-app && npx jest feature-toggle-admin.service`
Expected: FAIL — `Cannot find module './feature-toggle-admin.service'` (service not created yet).

- [ ] **Step 4: Implement the service**

Create `src/app/features/admin/feature-toggles/feature-toggle-admin.service.ts`:

```ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { FeatureToggle, SetPercentageRequest } from './feature-toggle.models';

/**
 * Client for the backend admin feature-toggle surface (/api/admin/feature-toggles).
 * Dedicated to this feature — kept separate from the account-focused ApiService.
 */
@Injectable({ providedIn: 'root' })
export class FeatureToggleAdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/admin/feature-toggles`;

  list(): Observable<FeatureToggle[]> {
    return this.http.get<FeatureToggle[]>(this.baseUrl);
  }

  get(name: string): Observable<FeatureToggle> {
    return this.http.get<FeatureToggle>(this.toggleUrl(name));
  }

  setGlobalPercentage(name: string, percentage: number): Observable<FeatureToggle> {
    const body: SetPercentageRequest = { percentage };
    return this.http.put<FeatureToggle>(this.toggleUrl(name), body);
  }

  setOrganizationOverride(
    name: string,
    organizationId: string,
    percentage: number,
  ): Observable<FeatureToggle> {
    const body: SetPercentageRequest = { percentage };
    return this.http.put<FeatureToggle>(this.overrideUrl(name, organizationId), body);
  }

  removeOrganizationOverride(name: string, organizationId: string): Observable<void> {
    return this.http.delete<void>(this.overrideUrl(name, organizationId));
  }

  private toggleUrl(name: string): string {
    return `${this.baseUrl}/${encodeURIComponent(name)}`;
  }

  private overrideUrl(name: string, organizationId: string): string {
    return `${this.toggleUrl(name)}/organizations/${encodeURIComponent(organizationId)}`;
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd ~/workspace/zarlania-app && npx jest feature-toggle-admin.service`
Expected: PASS — all five service tests green.

- [ ] **Step 6: Commit**

```bash
cd ~/workspace/zarlania-app
git add src/app/features/admin/feature-toggles/feature-toggle.models.ts \
        src/app/features/admin/feature-toggles/feature-toggle-admin.service.ts \
        src/app/features/admin/feature-toggles/feature-toggle-admin.service.spec.ts
git commit -m "feat: add feature toggle admin API service (#39)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Frontend — `FeatureToggleCardComponent` (presentational)

**Files:**
- Create: `src/app/features/admin/feature-toggles/feature-toggle-card.component.ts`
- Create: `src/app/features/admin/feature-toggles/feature-toggle-card.component.html`
- Create: `src/app/features/admin/feature-toggles/feature-toggle-card.component.scss`
- Test: `src/app/features/admin/feature-toggles/feature-toggle-card.component.spec.ts`

**Interfaces:**
- Consumes: `FeatureToggle` from `feature-toggle.models` (Task 2).
- Produces (relied on by Task 4) — a standalone component `<app-feature-toggle-card>` with:
  - Inputs: `toggle = input.required<FeatureToggle>()`, `pending = input<boolean>(false)`, `errorMessage = input<string | null>(null)`.
  - Outputs: `setGlobalPercentage = output<number>()`, `setOrganizationOverride = output<{ organizationId: string; percentage: number }>()`, `removeOrganizationOverride = output<string>()`.

- [ ] **Step 1: Write the failing card tests**

Create `src/app/features/admin/feature-toggles/feature-toggle-card.component.spec.ts`:

```ts
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FeatureToggleCardComponent } from './feature-toggle-card.component';
import { FeatureToggle } from './feature-toggle.models';

const organizationId = '11111111-1111-1111-1111-111111111111';
const toggle: FeatureToggle = {
  name: 'feature-service-canary',
  percentage: 40,
  organizationOverrides: [{ organizationId, percentage: 75 }],
};

function setup(overrides: Partial<FeatureToggle> = {}): ComponentFixture<FeatureToggleCardComponent> {
  TestBed.configureTestingModule({ imports: [FeatureToggleCardComponent] });
  const fixture = TestBed.createComponent(FeatureToggleCardComponent);
  fixture.componentRef.setInput('toggle', { ...toggle, ...overrides });
  fixture.detectChanges();
  return fixture;
}

function query<T extends HTMLElement>(fixture: ComponentFixture<FeatureToggleCardComponent>, selector: string): T {
  return fixture.nativeElement.querySelector(selector) as T;
}

function setValue(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('FeatureToggleCardComponent', () => {
  it('shows the toggle name and its overrides', () => {
    const fixture = setup();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('feature-service-canary');
    expect(text).toContain(organizationId);
    expect(text).toContain('75');
  });

  it('emits 0 when Off is clicked and 100 when On is clicked', () => {
    const fixture = setup();
    const emitted: number[] = [];
    fixture.componentInstance.setGlobalPercentage.subscribe((p) => emitted.push(p));
    query<HTMLButtonElement>(fixture, '[data-test="global-off"]').click();
    query<HTMLButtonElement>(fixture, '[data-test="global-on"]').click();
    expect(emitted).toEqual([0, 100]);
  });

  it('emits the entered value when Apply is clicked for the global percentage', () => {
    const fixture = setup();
    let emitted: number | undefined;
    fixture.componentInstance.setGlobalPercentage.subscribe((p) => (emitted = p));
    setValue(query<HTMLInputElement>(fixture, '[data-test="global-percentage"]'), '55');
    query<HTMLButtonElement>(fixture, '[data-test="global-apply"]').click();
    expect(emitted).toBe(55);
  });

  it('emits removeOrganizationOverride with the organization id when Remove is clicked', () => {
    const fixture = setup();
    let emitted: string | undefined;
    fixture.componentInstance.removeOrganizationOverride.subscribe((id) => (emitted = id));
    query<HTMLButtonElement>(fixture, '[data-test="override-remove"]').click();
    expect(emitted).toBe(organizationId);
  });

  it('emits the edited percentage for an existing override when its Apply is clicked', () => {
    const fixture = setup();
    let emitted: { organizationId: string; percentage: number } | undefined;
    fixture.componentInstance.setOrganizationOverride.subscribe((e) => (emitted = e));
    setValue(query<HTMLInputElement>(fixture, '[data-test="override-percentage"]'), '10');
    query<HTMLButtonElement>(fixture, '[data-test="override-apply"]').click();
    expect(emitted).toEqual({ organizationId, percentage: 10 });
  });

  it('disables the add-override save until a valid UUID and percentage are entered', () => {
    const fixture = setup();
    const save = query<HTMLButtonElement>(fixture, '[data-test="add-save"]');
    expect(save.disabled).toBe(true);
    setValue(query<HTMLInputElement>(fixture, '[data-test="add-organization-id"]'), 'not-a-uuid');
    setValue(query<HTMLInputElement>(fixture, '[data-test="add-percentage"]'), '20');
    fixture.detectChanges();
    expect(save.disabled).toBe(true);
    setValue(query<HTMLInputElement>(fixture, '[data-test="add-organization-id"]'), organizationId);
    fixture.detectChanges();
    expect(save.disabled).toBe(false);
  });

  it('emits setOrganizationOverride when a new override is saved', () => {
    const fixture = setup({ organizationOverrides: [] });
    let emitted: { organizationId: string; percentage: number } | undefined;
    fixture.componentInstance.setOrganizationOverride.subscribe((e) => (emitted = e));
    setValue(query<HTMLInputElement>(fixture, '[data-test="add-organization-id"]'), organizationId);
    setValue(query<HTMLInputElement>(fixture, '[data-test="add-percentage"]'), '30');
    fixture.detectChanges();
    query<HTMLButtonElement>(fixture, '[data-test="add-save"]').click();
    expect(emitted).toEqual({ organizationId, percentage: 30 });
  });

  it('disables the action buttons while a write is pending', () => {
    const fixture = setup();
    fixture.componentRef.setInput('pending', true);
    fixture.detectChanges();
    expect(query<HTMLButtonElement>(fixture, '[data-test="global-apply"]').disabled).toBe(true);
    expect(query<HTMLButtonElement>(fixture, '[data-test="override-remove"]').disabled).toBe(true);
  });

  it('shows the error message when one is provided', () => {
    const fixture = setup();
    fixture.componentRef.setInput('errorMessage', 'Update failed');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Update failed');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd ~/workspace/zarlania-app && npx jest feature-toggle-card`
Expected: FAIL — `Cannot find module './feature-toggle-card.component'`.

- [ ] **Step 3: Implement the card component class**

Create `src/app/features/admin/feature-toggles/feature-toggle-card.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FeatureToggle } from './feature-toggle.models';

/** Matches a canonical lowercase UUID (the form the backend uses for organization ids). */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Presentational card for a single feature toggle. Renders the global percentage control
 * (with Off/On shortcuts), the existing organization overrides, and an add/replace-override
 * form. Owns no server state: it emits the operator's intent and the page performs the write.
 */
@Component({
  selector: 'app-feature-toggle-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './feature-toggle-card.component.html',
  styleUrl: './feature-toggle-card.component.scss',
})
export class FeatureToggleCardComponent {
  private readonly fb = inject(FormBuilder);

  readonly toggle = input.required<FeatureToggle>();
  readonly pending = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly setGlobalPercentage = output<number>();
  readonly setOrganizationOverride = output<{ organizationId: string; percentage: number }>();
  readonly removeOrganizationOverride = output<string>();

  readonly addForm = this.fb.nonNullable.group({
    organizationId: ['', [Validators.required, Validators.pattern(UUID_PATTERN)]],
    percentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  applyGlobal(rawValue: string): void {
    this.setGlobalPercentage.emit(this.clampPercentage(rawValue));
  }

  applyOverride(organizationId: string, rawValue: string): void {
    this.setOrganizationOverride.emit({
      organizationId,
      percentage: this.clampPercentage(rawValue),
    });
  }

  saveNewOverride(): void {
    if (this.addForm.invalid) {
      return;
    }
    const { organizationId, percentage } = this.addForm.getRawValue();
    this.setOrganizationOverride.emit({ organizationId, percentage });
    this.addForm.reset({ organizationId: '', percentage: 0 });
  }

  private clampPercentage(rawValue: string): number {
    const parsed = Math.trunc(Number(rawValue));
    if (Number.isNaN(parsed)) {
      return 0;
    }
    return Math.min(100, Math.max(0, parsed));
  }
}
```

- [ ] **Step 4: Implement the card template**

Create `src/app/features/admin/feature-toggles/feature-toggle-card.component.html`:

```html
<section class="card">
  <h2 class="card__name">{{ toggle().name }}</h2>

  <div class="card__row">
    <span class="card__label">Global</span>
    <input
      #global
      data-test="global-percentage"
      type="number"
      min="0"
      max="100"
      [value]="toggle().percentage"
      [disabled]="pending()"
    />
    <span>%</span>
    <button
      type="button"
      data-test="global-apply"
      [disabled]="pending()"
      (click)="applyGlobal(global.value)"
    >
      Apply
    </button>
    <button
      type="button"
      data-test="global-off"
      [disabled]="pending()"
      (click)="setGlobalPercentage.emit(0)"
    >
      Off
    </button>
    <button
      type="button"
      data-test="global-on"
      [disabled]="pending()"
      (click)="setGlobalPercentage.emit(100)"
    >
      On
    </button>
  </div>

  <ul class="card__overrides">
    @for (override of toggle().organizationOverrides; track override.organizationId) {
      <li class="card__row">
        <code class="card__organization">{{ override.organizationId }}</code>
        <input
          #overridePercentage
          data-test="override-percentage"
          type="number"
          min="0"
          max="100"
          [value]="override.percentage"
          [disabled]="pending()"
        />
        <span>%</span>
        <button
          type="button"
          data-test="override-apply"
          [disabled]="pending()"
          (click)="applyOverride(override.organizationId, overridePercentage.value)"
        >
          Apply
        </button>
        <button
          type="button"
          data-test="override-remove"
          [disabled]="pending()"
          (click)="removeOrganizationOverride.emit(override.organizationId)"
        >
          Remove
        </button>
      </li>
    } @empty {
      <li class="card__empty">No organization overrides.</li>
    }
  </ul>

  <div class="card__add" [formGroup]="addForm">
    <span class="card__label">Add / replace override</span>
    <input
      data-test="add-organization-id"
      type="text"
      placeholder="organization UUID"
      formControlName="organizationId"
    />
    <input data-test="add-percentage" type="number" min="0" max="100" formControlName="percentage" />
    <span>%</span>
    <button
      type="button"
      data-test="add-save"
      [disabled]="pending() || addForm.invalid"
      (click)="saveNewOverride()"
    >
      Save override
    </button>
  </div>

  @if (errorMessage()) {
    <p class="card__error" role="alert">{{ errorMessage() }}</p>
  }
</section>
```

- [ ] **Step 5: Add minimal styles**

Create `src/app/features/admin/feature-toggles/feature-toggle-card.component.scss`:

```scss
.card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid currentColor;
  border-radius: 0.5rem;
}

.card__row,
.card__add {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.card__overrides {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card__label {
  font-weight: 600;
}

.card__organization {
  font-family: monospace;
}

.card__error {
  color: #b00020;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd ~/workspace/zarlania-app && npx jest feature-toggle-card`
Expected: PASS — all card tests green.

- [ ] **Step 7: Commit**

```bash
cd ~/workspace/zarlania-app
git add src/app/features/admin/feature-toggles/feature-toggle-card.component.ts \
        src/app/features/admin/feature-toggles/feature-toggle-card.component.html \
        src/app/features/admin/feature-toggles/feature-toggle-card.component.scss \
        src/app/features/admin/feature-toggles/feature-toggle-card.component.spec.ts
git commit -m "feat: add feature toggle card component (#39)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Frontend — `FeatureTogglesPageComponent` + route + version bump

**Files:**
- Create: `src/app/features/admin/feature-toggles/feature-toggles-page.component.ts`
- Create: `src/app/features/admin/feature-toggles/feature-toggles-page.component.html`
- Create: `src/app/features/admin/feature-toggles/feature-toggles-page.component.scss`
- Test: `src/app/features/admin/feature-toggles/feature-toggles-page.component.spec.ts`
- Modify: `src/app/app.routes.ts` (add the `admin/feature-toggles` route before the `**` wildcard)
- Modify: `src/app/app.routes.spec.ts` (assert the new route renders)
- Modify: `package.json` (`"version"`)

**Interfaces:**
- Consumes: `FeatureToggleAdminService` and `FeatureToggle` (Task 2); `FeatureToggleCardComponent` (Task 3).
- Produces: a standalone, lazy-loadable `FeatureTogglesPageComponent` reachable at `admin/feature-toggles`.

- [ ] **Step 1: Write the failing page tests**

Create `src/app/features/admin/feature-toggles/feature-toggles-page.component.spec.ts`:

```ts
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { FeatureTogglesPageComponent } from './feature-toggles-page.component';
import { FeatureToggleAdminService } from './feature-toggle-admin.service';
import { FeatureToggle } from './feature-toggle.models';

const organizationId = '11111111-1111-1111-1111-111111111111';
const canary: FeatureToggle = {
  name: 'feature-service-canary',
  percentage: 0,
  organizationOverrides: [],
};

function setup(api: Partial<FeatureToggleAdminService>): ComponentFixture<FeatureTogglesPageComponent> {
  TestBed.configureTestingModule({
    providers: [{ provide: FeatureToggleAdminService, useValue: api }],
  });
  const fixture = TestBed.createComponent(FeatureTogglesPageComponent);
  fixture.detectChanges();
  return fixture;
}

describe('FeatureTogglesPageComponent', () => {
  it('renders a card per toggle once loaded', () => {
    const fixture = setup({ list: jest.fn().mockReturnValue(of([canary])) });
    expect(fixture.nativeElement.textContent).toContain('feature-service-canary');
  });

  it('shows an empty state when there are no toggles', () => {
    const fixture = setup({ list: jest.fn().mockReturnValue(of([])) });
    expect(fixture.nativeElement.textContent).toContain('No feature toggles');
  });

  it('shows a retryable error when the list fails, then loads on retry', () => {
    const list = jest
      .fn()
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })))
      .mockReturnValueOnce(of([canary]));
    const fixture = setup({ list });
    expect(fixture.nativeElement.textContent).toContain('Could not load');
    (fixture.nativeElement.querySelector('[data-test="retry"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('feature-service-canary');
  });

  it('sets the global percentage and replaces the toggle from the response', () => {
    const updated = { ...canary, percentage: 100 };
    const setGlobalPercentage = jest.fn().mockReturnValue(of(updated));
    const fixture = setup({
      list: jest.fn().mockReturnValue(of([canary])),
      setGlobalPercentage,
    });
    (fixture.nativeElement.querySelector('[data-test="global-on"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(setGlobalPercentage).toHaveBeenCalledWith('feature-service-canary', 100);
    expect(
      (fixture.nativeElement.querySelector('[data-test="global-percentage"]') as HTMLInputElement).value,
    ).toBe('100');
  });

  it('re-fetches the toggle after removing an organization override', () => {
    const withOverride: FeatureToggle = {
      ...canary,
      organizationOverrides: [{ organizationId, percentage: 50 }],
    };
    const removeOrganizationOverride = jest.fn().mockReturnValue(of(undefined));
    const get = jest.fn().mockReturnValue(of(canary));
    const fixture = setup({
      list: jest.fn().mockReturnValue(of([withOverride])),
      removeOrganizationOverride,
      get,
    });
    (fixture.nativeElement.querySelector('[data-test="override-remove"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(removeOrganizationOverride).toHaveBeenCalledWith('feature-service-canary', organizationId);
    expect(get).toHaveBeenCalledWith('feature-service-canary');
    expect(fixture.nativeElement.textContent).not.toContain(organizationId);
  });

  it('shows a per-card error when a write fails and keeps the other toggles usable', () => {
    const setGlobalPercentage = jest
      .fn()
      .mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = setup({
      list: jest.fn().mockReturnValue(of([canary])),
      setGlobalPercentage,
    });
    (fixture.nativeElement.querySelector('[data-test="global-on"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Update failed');
  });

  it('disables a card while its write is in flight', () => {
    const pending = new Subject<FeatureToggle>();
    const fixture = setup({
      list: jest.fn().mockReturnValue(of([canary])),
      setGlobalPercentage: jest.fn().mockReturnValue(pending),
    });
    (fixture.nativeElement.querySelector('[data-test="global-on"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(
      (fixture.nativeElement.querySelector('[data-test="global-apply"]') as HTMLButtonElement).disabled,
    ).toBe(true);
    pending.next({ ...canary, percentage: 100 });
    pending.complete();
    fixture.detectChanges();
    expect(
      (fixture.nativeElement.querySelector('[data-test="global-apply"]') as HTMLButtonElement).disabled,
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd ~/workspace/zarlania-app && npx jest feature-toggles-page`
Expected: FAIL — `Cannot find module './feature-toggles-page.component'`.

- [ ] **Step 3: Implement the page component class**

Create `src/app/features/admin/feature-toggles/feature-toggles-page.component.ts`:

```ts
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { FeatureToggleCardComponent } from './feature-toggle-card.component';
import { FeatureToggleAdminService } from './feature-toggle-admin.service';
import { FeatureToggle } from './feature-toggle.models';

/**
 * Admin page listing every feature toggle. Owns all server state and orchestrates writes:
 * a successful PUT replaces the toggle from the response; a DELETE (204) is followed by a
 * re-fetch of that toggle. Presentation of a single toggle is delegated to the card.
 */
@Component({
  selector: 'app-feature-toggles-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FeatureToggleCardComponent],
  templateUrl: './feature-toggles-page.component.html',
  styleUrl: './feature-toggles-page.component.scss',
})
export class FeatureTogglesPageComponent implements OnInit {
  private readonly service = inject(FeatureToggleAdminService);
  private readonly destroyRef = inject(DestroyRef);

  readonly toggles = signal<FeatureToggle[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly pending = signal<ReadonlySet<string>>(new Set());
  readonly writeErrors = signal<ReadonlyMap<string, string>>(new Map());

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.service
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (toggles) => {
          this.toggles.set(toggles);
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set(true);
          this.loading.set(false);
        },
      });
  }

  isPending(name: string): boolean {
    return this.pending().has(name);
  }

  errorFor(name: string): string | null {
    return this.writeErrors().get(name) ?? null;
  }

  onSetGlobalPercentage(name: string, percentage: number): void {
    this.runWrite(name, this.service.setGlobalPercentage(name, percentage));
  }

  onSetOrganizationOverride(
    name: string,
    event: { organizationId: string; percentage: number },
  ): void {
    this.runWrite(
      name,
      this.service.setOrganizationOverride(name, event.organizationId, event.percentage),
    );
  }

  onRemoveOrganizationOverride(name: string, organizationId: string): void {
    this.markPending(name);
    this.service
      .removeOrganizationOverride(name, organizationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.refreshToggle(name),
        error: () => this.failWrite(name),
      });
  }

  private runWrite(name: string, request: Observable<FeatureToggle>): void {
    this.markPending(name);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => this.applyUpdate(updated),
      error: () => this.failWrite(name),
    });
  }

  private refreshToggle(name: string): void {
    this.service
      .get(name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => this.applyUpdate(updated),
        error: () => this.failWrite(name),
      });
  }

  private applyUpdate(updated: FeatureToggle): void {
    this.toggles.update((toggles) =>
      toggles.map((toggle) => (toggle.name === updated.name ? updated : toggle)),
    );
    this.clearError(updated.name);
    this.clearPending(updated.name);
  }

  private failWrite(name: string): void {
    this.writeErrors.update((errors) => new Map(errors).set(name, 'Update failed. Please retry.'));
    this.clearPending(name);
  }

  private markPending(name: string): void {
    this.pending.update((names) => new Set(names).add(name));
  }

  private clearPending(name: string): void {
    this.pending.update((names) => {
      const next = new Set(names);
      next.delete(name);
      return next;
    });
  }

  private clearError(name: string): void {
    this.writeErrors.update((errors) => {
      const next = new Map(errors);
      next.delete(name);
      return next;
    });
  }
}
```

- [ ] **Step 4: Implement the page template**

Create `src/app/features/admin/feature-toggles/feature-toggles-page.component.html`:

```html
<main class="page">
  <h1 class="page__title">Feature toggles</h1>

  @if (loading()) {
    <p data-test="loading">Loading feature toggles…</p>
  } @else if (loadError()) {
    <p role="alert">Could not load feature toggles.</p>
    <button type="button" data-test="retry" (click)="load()">Retry</button>
  } @else if (toggles().length === 0) {
    <p data-test="empty">No feature toggles are registered.</p>
  } @else {
    <div class="page__list">
      @for (toggle of toggles(); track toggle.name) {
        <app-feature-toggle-card
          [toggle]="toggle"
          [pending]="isPending(toggle.name)"
          [errorMessage]="errorFor(toggle.name)"
          (setGlobalPercentage)="onSetGlobalPercentage(toggle.name, $event)"
          (setOrganizationOverride)="onSetOrganizationOverride(toggle.name, $event)"
          (removeOrganizationOverride)="onRemoveOrganizationOverride(toggle.name, $event)"
        />
      }
    </div>
  }
</main>
```

- [ ] **Step 5: Add minimal styles**

Create `src/app/features/admin/feature-toggles/feature-toggles-page.component.scss`:

```scss
.page {
  max-width: 48rem;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.page__list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
```

- [ ] **Step 6: Run the page tests to verify they pass**

Run: `cd ~/workspace/zarlania-app && npx jest feature-toggles-page`
Expected: PASS — all page tests green.

- [ ] **Step 7: Register the lazy route**

In `src/app/app.routes.ts`, insert this route object immediately before the `'**'` wildcard entry:

```ts
  {
    path: 'admin/feature-toggles',
    loadComponent: () =>
      import('./features/admin/feature-toggles/feature-toggles-page.component').then(
        (m) => m.FeatureTogglesPageComponent,
      ),
  },
```

- [ ] **Step 8: Add a route test**

In `src/app/app.routes.spec.ts`, add this test inside the `describe('app routes', ...)` block. It renders the page with the API service stubbed so the route resolves without a real HTTP call:

```ts
  it('renders the feature toggles admin page at /admin/feature-toggles', async () => {
    const { FeatureToggleAdminService } = await import(
      './features/admin/feature-toggles/feature-toggle-admin.service'
    );
    const { of } = await import('rxjs');
    TestBed.overrideProvider(FeatureToggleAdminService, {
      useValue: { list: () => of([]) },
    });
    expect(await navigateAndRead('/admin/feature-toggles')).toContain('Feature toggles');
  });
```

- [ ] **Step 9: Run the route + full suite to verify green**

Run: `cd ~/workspace/zarlania-app && npm run test:ci`
Expected: PASS — every spec green and coverage ≥ 80%.

- [ ] **Step 10: Lint and format**

Run: `cd ~/workspace/zarlania-app && npm run lint`
Expected: PASS — ESLint and Prettier report no problems. (If Prettier flags formatting, run `npm run format` and re-run.)

- [ ] **Step 11: Bump the version (minor)**

Run: `cd ~/workspace/zarlania-app && ./scripts/bump-version bump minor`
Expected: `package.json` `"version"` advances by one minor (e.g. `0.3.3` → `0.4.0`).

- [ ] **Step 12: Commit**

```bash
cd ~/workspace/zarlania-app
git add src/app/features/admin/feature-toggles/feature-toggles-page.component.ts \
        src/app/features/admin/feature-toggles/feature-toggles-page.component.html \
        src/app/features/admin/feature-toggles/feature-toggles-page.component.scss \
        src/app/features/admin/feature-toggles/feature-toggles-page.component.spec.ts \
        src/app/app.routes.ts src/app/app.routes.spec.ts package.json
git commit -m "feat: add feature toggles admin page and route (#39)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 13: Push and open the PR (label `release:minor`)**

```bash
cd ~/workspace/zarlania-app
git push -u origin feat/39-feature-toggle-admin-page
gh pr create --fill --label release:minor \
  --title "feat: feature toggle admin page (#39)"
```

Open the backend PR (Task 1) first and confirm it is merged before merging this one, so the production writes work.

---

## Manual verification (after both PRs merge and deploy)

1. Visit `https://zarlania.com/admin/feature-toggles` — the `feature-service-canary` card renders.
2. Click **On**; the global input shows `100`. Reload — it persists (until the backend restarts, which resets it to off per the in-memory H2 caveat).
3. Add an override with a real organization UUID at `50`; confirm it appears in the list.
4. Click **Remove** on that override; confirm it disappears (page re-fetches the toggle).
