import { buildBodyParserOptions } from './body-parser.config';

describe('buildBodyParserOptions', () => {
  it('applies the configured body limit to json and urlencoded parsers', () => {
    expect(buildBodyParserOptions('100kb')).toEqual({
      json: { limit: '100kb' },
      urlencoded: { extended: true, limit: '100kb' },
    });
  });
});
