/** Validates a phone number against the E.164 format (e.g. +15550001234). */
export function e164Validator(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}
