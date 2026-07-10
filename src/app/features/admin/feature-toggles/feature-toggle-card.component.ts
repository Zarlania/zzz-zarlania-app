import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FeatureToggle } from './feature-toggle.models';

/** Matches a canonical UUID form (case-insensitive). */
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
  private readonly formBuilder = inject(FormBuilder);

  readonly toggle = input.required<FeatureToggle>();
  readonly pending = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly setGlobalPercentage = output<number>();
  readonly setOrganizationOverride = output<{ organizationId: string; percentage: number }>();
  readonly removeOrganizationOverride = output<string>();

  readonly addForm = this.formBuilder.nonNullable.group({
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
    this.setOrganizationOverride.emit({
      organizationId,
      percentage: this.clampPercentage(String(percentage)),
    });
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
