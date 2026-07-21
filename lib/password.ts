/**
 * Shared password policy for every place a password is set:
 * self-service change (/api/me/password), admin create and admin reset.
 */

// Small blocklist of the most common passwords that also satisfy the
// length/composition rules below.
const COMMON_PASSWORDS = new Set([
  'password1', 'password12', 'password123', 'passw0rd12', 'qwerty12345',
  'qwertyuiop1', '1234567890', '12345678910', 'abc123456789', 'iloveyou123',
  'admin12345', 'welcome123', 'letmein12345', 'monkey123456', 'dragon123456',
  'football1234', 'baseball1234', 'superman1234', 'sunshine1234', 'princess1234',
]);

export interface PasswordCheck {
  ok: boolean;
  error?: string;
}

/**
 * Validate a new password. Returns { ok: false, error } with a
 * user-facing English message when the password is rejected.
 *
 * Rules: 10–72 chars (bcrypt silently truncates beyond 72 bytes), at least
 * one letter and one digit, not a known common password, and must not
 * contain the local part of the user's email.
 */
export function validatePassword(password: string, email?: string | null): PasswordCheck {
  if (password.length < 10) {
    return { ok: false, error: 'Password must be at least 10 characters' };
  }
  if (password.length > 72) {
    return { ok: false, error: 'Password must be at most 72 characters' };
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { ok: false, error: 'Password must include at least one letter and one number' };
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { ok: false, error: 'This password is too common — choose a different one' };
  }
  const localPart = email?.split('@')[0]?.toLowerCase();
  if (localPart && localPart.length >= 4 && password.toLowerCase().includes(localPart)) {
    return { ok: false, error: 'Password must not contain your email address' };
  }
  return { ok: true };
}
