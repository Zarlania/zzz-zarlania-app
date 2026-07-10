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

function setup(
  api: Partial<FeatureToggleAdminService>,
): ComponentFixture<FeatureTogglesPageComponent> {
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
      (fixture.nativeElement.querySelector('[data-test="global-percentage"]') as HTMLInputElement)
        .value,
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
    (
      fixture.nativeElement.querySelector('[data-test="override-remove"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(removeOrganizationOverride).toHaveBeenCalledWith(
      'feature-service-canary',
      organizationId,
    );
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
      (fixture.nativeElement.querySelector('[data-test="global-apply"]') as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    pending.next({ ...canary, percentage: 100 });
    pending.complete();
    fixture.detectChanges();
    expect(
      (fixture.nativeElement.querySelector('[data-test="global-apply"]') as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
});
