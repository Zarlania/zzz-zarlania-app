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
