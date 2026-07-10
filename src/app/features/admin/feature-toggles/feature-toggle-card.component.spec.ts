import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FeatureToggleCardComponent } from './feature-toggle-card.component';
import { FeatureToggle } from './feature-toggle.models';

const organizationId = '11111111-1111-1111-1111-111111111111';
const toggle: FeatureToggle = {
  name: 'feature-service-canary',
  percentage: 40,
  organizationOverrides: [{ organizationId, percentage: 75 }],
};

function setup(
  overrides: Partial<FeatureToggle> = {},
): ComponentFixture<FeatureToggleCardComponent> {
  TestBed.configureTestingModule({ imports: [FeatureToggleCardComponent] });
  const fixture = TestBed.createComponent(FeatureToggleCardComponent);
  fixture.componentRef.setInput('toggle', { ...toggle, ...overrides });
  fixture.detectChanges();
  return fixture;
}

function query<T extends HTMLElement>(
  fixture: ComponentFixture<FeatureToggleCardComponent>,
  selector: string,
): T {
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
