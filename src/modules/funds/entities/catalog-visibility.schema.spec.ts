import {
  catalogVisibilitySchema,
  isCatalogVisible,
} from './catalog-visibility.schema';

describe('catalogVisibilitySchema', () => {
  it('should validate supported catalog visibility states', () => {
    expect(catalogVisibilitySchema.parse('visible')).toBe('visible');
    expect(catalogVisibilitySchema.parse('quarantined')).toBe('quarantined');
    expect(catalogVisibilitySchema.parse('blocked')).toBe('blocked');
  });
});

describe('isCatalogVisible', () => {
  it('should allow only visible funds in the public catalog', () => {
    expect(isCatalogVisible({ catalogVisibility: 'visible' })).toBe(true);
    expect(isCatalogVisible({ catalogVisibility: 'quarantined' })).toBe(false);
    expect(isCatalogVisible({ catalogVisibility: 'blocked' })).toBe(false);
  });
});
