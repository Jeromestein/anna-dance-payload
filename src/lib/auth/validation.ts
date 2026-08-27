export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 100;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value);
}

export function isValidPassword(value: string) {
  return value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH;
}

export function isValidName(value: string) {
  return value.length >= NAME_MIN_LENGTH && value.length <= NAME_MAX_LENGTH;
}

export function isValidOptionalName(value: string) {
  return value.length <= NAME_MAX_LENGTH;
}

export function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 && /^[\d\s()+.-]+$/.test(value);
}
