import { z } from 'zod';

/** Supported client platforms for anonymous device registration. */
export const anonymousDevicePlatformSchema = z.enum(['ios', 'android', 'web']);

export const registerAnonymousDeviceSchema = z.object({
  platform: anonymousDevicePlatformSchema,
  appVersion: z.string().trim().min(1).max(32).optional(),
});

export type RegisterAnonymousDeviceInput = z.infer<
  typeof registerAnonymousDeviceSchema
>;

export const registerAnonymousDeviceResponseSchema = z.object({
  deviceToken: z.string().min(40),
  deviceId: z.string().min(1),
});

export type RegisterAnonymousDeviceResponse = z.infer<
  typeof registerAnonymousDeviceResponseSchema
>;

export const heartbeatAnonymousDeviceSchema = z.object({
  appVersion: z.string().trim().min(1).max(32).optional(),
});

export type HeartbeatAnonymousDeviceInput = z.infer<
  typeof heartbeatAnonymousDeviceSchema
>;

export const upsertAnonymousEducationalProfileResponseSchema = z.object({
  saved: z.literal(true),
  deviceId: z.string().min(1),
});

export type UpsertAnonymousEducationalProfileResponse = z.infer<
  typeof upsertAnonymousEducationalProfileResponseSchema
>;
