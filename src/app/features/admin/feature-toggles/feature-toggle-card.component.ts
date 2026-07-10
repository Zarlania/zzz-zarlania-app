import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FeatureToggle } from './feature-toggle.models';

/** Matches a canonical UUID form (case-insensitive). */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Shown when an operator applies a blank or non-numeric percentage. */
const INVALID_PERCENTAGE_MESSAGE = 'Enter a whole percentage from 0 to 100.';

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

  /** Client-side validation message for the free-typed Apply fields. */
  readonly validationError = signal<string | null>(null);

  readonly addForm = this.formBuilder.nonNullable.group({
    organizationId: ['', [Validators.required, Validators.pattern(UUID_PATTERN)]],
    percentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  applyGlobal(rawValue: string): void {
    const percentage = this.parsePercentage(rawValue);
    if (percentage === null) {
      this.validationError.set(INVALID_PERCENTAGE_MESSAGE);
      return;
    }
    this.validationError.set(null);
    this.setGlobalPercentage.emit(percentage);
  }

  applyOverride(organizationId: string, rawValue: string): void {
    const percentage = this.parsePercentage(rawValue);
    if (percentage === null) {
      this.validationError.set(INVALID_PERCENTAGE_MESSAGE);
      return;
    }
    this.validationError.set(null);
    this.setOrganizationOverride.emit({ organizationId, percentage });
  }

  saveNewOverride(): void {
    if (this.addForm.invalid) {
      return;
    }
    const { organizationId, percentage } = this.addForm.getRawValue();
    this.setOrganizationOverride.emit({
      organizationId,
      percentage: this.clampPercentage(percentage),
    });
    this.addForm.reset({ organizationId: '', percentage: 0 });
  }

  /** Truncate and clamp a numeric percentage into the [0, 100] integer range. */
  private clampPercentage(value: number): number {
    return Math.min(100, Math.max(0, Math.trunc(value)));
  }

  /**
   * Parse a raw input string to a valid integer percentage, or null when it is blank or
   * non-numeric — so an emptied field is rejected rather than silently applied as 0 (off).
   */
  private parsePercentage(rawValue: string): number | null {
    const trimmed = rawValue.trim();
    if (trimmed === '') {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? this.clampPercentage(parsed) : null;
  }
}
