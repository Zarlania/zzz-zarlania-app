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
