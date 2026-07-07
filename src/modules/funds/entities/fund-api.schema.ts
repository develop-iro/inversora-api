import { z } from 'zod';
import { fundSchema } from './fund.schema';
import { fundReturnSnapshotSchema } from './fund-return-snapshot.schema';

/** Public fund payload schema for HTTP list/detail responses. */
export const fundApiSchema = fundSchema.extend({
  logoUrl: z.string().nullable(),
  returns: fundReturnSnapshotSchema,
});

/** Public fund payload type for HTTP list/detail responses. */
export type FundApi = z.infer<typeof fundApiSchema>;
