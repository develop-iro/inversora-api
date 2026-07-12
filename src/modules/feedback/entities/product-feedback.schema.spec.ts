import { productFeedbackSchema } from './product-feedback.schema';

describe('productFeedbackSchema', () => {
  it('should accept a valid anonymous feedback payload', () => {
    const parsed = productFeedbackSchema.parse({
      clarity: 'somewhat',
      wouldReturn: 'maybe',
      message: 'El ranking me costó un poco al principio.',
      surface: 'feedback',
      appEnv: 'qa',
      appVersion: '1.0.0',
    });

    expect(parsed.clarity).toBe('somewhat');
    expect(parsed.wouldReturn).toBe('maybe');
    expect(parsed.message).toBe('El ranking me costó un poco al principio.');
  });

  it('should default the surface when omitted', () => {
    const parsed = productFeedbackSchema.parse({
      clarity: 'yes',
      wouldReturn: 'yes',
    });

    expect(parsed.surface).toBe('feedback');
  });

  it('should reject messages longer than 2000 characters', () => {
    expect(() =>
      productFeedbackSchema.parse({
        clarity: 'no',
        wouldReturn: 'no',
        message: 'x'.repeat(2001),
      }),
    ).toThrow();
  });

  it('should reject unknown clarity values', () => {
    expect(() =>
      productFeedbackSchema.parse({
        clarity: 'unclear',
        wouldReturn: 'yes',
      }),
    ).toThrow();
  });
});
