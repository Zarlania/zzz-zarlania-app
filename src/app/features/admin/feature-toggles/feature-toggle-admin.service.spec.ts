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
    const req = httpMock.expectOne(
      `${base}/feature-service-canary/organizations/${organizationId}`,
    );
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
    const req = httpMock.expectOne(
      `${base}/feature-service-canary/organizations/${organizationId}`,
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(completed).toBe(true);
  });
});
