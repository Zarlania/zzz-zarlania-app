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
