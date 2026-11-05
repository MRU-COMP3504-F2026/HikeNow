export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export type Credentials = { email: string; password: string };
export type AuthResult = { success: true } | { success: false; error: string };

export function validateCredentials(input: unknown, signup = false):
  | { credentials: Credentials }
  | { error: string } {
  if (
    !input || typeof input !== "object" ||
    !("email" in input) || typeof input.email !== "string" ||
    !("password" in input) || typeof input.password !== "string"
  ) {
    return { error: "Please enter your email and password." };
  }
  const email = input.email.trim().toLowerCase();
  if (email.length > 255 || !EMAIL_PATTERN.test(email)) {
    return { error: "Please enter a valid email." };
  }
  if (!input.password) return { error: "Please enter your password." };
  if (input.password.length > MAX_PASSWORD_LENGTH) {
    return { error: `Password must be at most ${MAX_PASSWORD_LENGTH} characters.` };
  }
  if (signup && input.password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  return { credentials: { email, password: input.password } };
}
