import {
  adminFundListQuerySchema,
  parseAdminFundListQuery,
  parseAdminUpdateCatalogVisibilityRequest,
} from './admin-funds.schema';

describe('admin-funds.schema', () => {
  it('should parse admin fund list queries with visibility filters', () => {
    expect(parseAdminFundListQuery({ page: '1' })).toMatchObject({
      page: 1,
    });

    expect(
      adminFundListQuerySchema.parse({
        catalogVisibility: 'blocked',
      }).catalogVisibility,
    ).toEqual(['blocked']);

    expect(
      adminFundListQuerySchema.parse({
        page: '1',
        catalogVisibility: ['quarantined', 'blocked'],
      }),
    ).toMatchObject({
      page: 1,
      catalogVisibility: ['quarantined', 'blocked'],
    });
  });

  it('should validate manual catalog visibility updates', () => {
    expect(
      parseAdminUpdateCatalogVisibilityRequest({
        catalogVisibility: 'visible',
        reason: 'Reviewed and approved for public catalog',
        actor: 'ops@inversora.dev',
      }),
    ).toEqual({
      catalogVisibility: 'visible',
      reason: 'Reviewed and approved for public catalog',
      actor: 'ops@inversora.dev',
    });
  });
});
