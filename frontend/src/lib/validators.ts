import { z } from 'zod';

// Mirrors backend httpx validation: 10-digit Indian mobile, 6-digit pincode.
export const phoneSchema = z
  .string()
  .transform((s) => s.replace(/[\s\-()]/g, '').replace(/^(\+91|91|0)/, ''))
  .refine((s) => /^[6-9]\d{9}$/.test(s), 'Enter a valid 10-digit mobile number');

export const pincodeSchema = z.string().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit pincode');

export const emailSchema = z.string().email('Enter a valid email');

export const addressSchema = z.object({
  line: z.string().min(6, 'Full address helps delivery succeed'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: pincodeSchema,
});
