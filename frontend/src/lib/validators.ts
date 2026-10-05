import { z } from 'zod';

// Mirrors backend httpx validation: 10-digit Indian mobile, 6-digit pincode.
export const phoneSchema = z
  .string()
  .transform((s) => {
    const digits = s.replace(/[\s\-()]/g, '').replace(/^\+/, '');
    // 91xxxxxxxx is itself a live mobile series, so a prefix is only stripped
    // when what remains is a full 10-digit number — same rule as NormalizePhone
    // in Go, which the API validates with.
    for (const prefix of ['91', '0']) {
      if (digits.length === 10 + prefix.length && digits.startsWith(prefix)) return digits.slice(prefix.length);
    }
    return digits;
  })
  .refine((s) => /^[6-9]\d{9}$/.test(s), 'Enter a valid 10-digit mobile number');

export const pincodeSchema = z.string().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit pincode');

/** Mirrors httpx.ValidUPI: handle@psp. Empty is allowed (UPI is optional). */
export const upiSchema = z
  .string()
  .trim()
  .refine((s) => s === '' || /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-]{1,63}$/.test(s), 'Enter a UPI ID like name@okhdfcbank');

/** Mirrors secure.Slug in Go, so the field preview matches what the API stores. */
export const storeCodeSlug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Mirrors auth.ValidateStoreCode. The API re-checks — this is only so the
 *  seller sees the problem while typing instead of after submitting. */
export const storeCodeSchema = z
  .string()
  .min(3, 'Use at least 3 characters')
  .max(30, 'Keep it under 31 characters')
  .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers and hyphens')
  .regex(/^[a-z0-9]/, 'Cannot start with a hyphen')
  .regex(/[a-z0-9]$/, 'Cannot end with a hyphen')
  .refine((s) => !s.includes('--'), 'No double hyphens');

// trimmed first: mobile keyboards append a space after an autocompleted address
export const emailSchema = z.string().trim().email('Enter a valid email');

export const addressSchema = z.object({
  line: z.string().min(6, 'Full address helps delivery succeed'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: pincodeSchema,
});

/** wa.me chat link for an Indian number in any of the forms sellers type it,
 *  optionally with a message typed in, ready to send. */
export const whatsappHref = (phone: string, text?: string) =>
  `https://wa.me/91${phone.replace(/\D/g, '').slice(-10)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
