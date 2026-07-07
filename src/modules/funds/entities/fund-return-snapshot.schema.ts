import { z } from 'zod';

/** Summary historical returns derived from persisted end-of-day prices. */
export const fundReturnSnapshotSchema = z.object({
  ytd: z.number().nullable(),
  oneYear: z.number().nullable(),
  threeYear: z.number().nullable(),
  asOf: z.string().nullable(),
});

/** Inferred type for a fund return snapshot. */
export type FundReturnSnapshot = z.infer<typeof fundReturnSnapshotSchema>;
