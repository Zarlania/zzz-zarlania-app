import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../api.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth">
      <h1>Create your vault</h1>
      <p class="sub">Start cataloging in minutes.</p>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
        <label class="field">
          <span>Email</span>
          <input type="email" formControlName="email" autocomplete="email" />
          @if (showError('email')) {
            <span class="field-error">Enter a valid email (max 320 characters).</span>
          }
        </label>

        <label class="field">
          <span>Username</span>
          <input type="text" formControlName="username" autocomplete="username" />
          @if (showError('username')) {
            <span class="field-error">A username is required (max 100 characters).</span>
          }
        </label>

        @if (errorMessage()) {
          <p class="form-error" role="alert">{{ errorMessage() }}</p>
        }

        <button type="submit" class="btn-primary" [disabled]="form.invalid || submitting()">
          {{ submitting() ? 'Creating…' : 'Create account' }}
        </button>
      </form>

      <p class="alt">Already have one? <a routerLink="/login">Log in</a></p>
    </section>
  `,
  styleUrls: ['../auth-forms.css'],
  styles: [
    `
      .field-error,
      .form-error {
        color: var(--color-action);
        font-size: 0.78rem;
      }
      .form-error {
        margin: 0 0 var(--space-3);
      }
    `,
  ],
})
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly submitting = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(320)]],
    username: ['', [Validators.required, Validators.maxLength(100)]],
  });

  showError(control: 'email' | 'username'): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set('');
    this.api
      .createAccount(this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (account) => {
          void this.router.navigate(['/home'], { state: { account } });
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.status === 409
              ? 'That email or username is already taken.'
              : 'Something went wrong creating your vault. Please try again.',
          );
        },
      });
  }
}
