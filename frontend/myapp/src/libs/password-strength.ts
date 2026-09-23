/** Mirrors the backend password policy (auth/dto/auth.dto.ts PASSWORD_RULE): 12+ chars, upper, lower, digit, symbol. */
export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  barColor: string;
}

const LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
const COLORS = ['#E2E8F0', '#B4192F', '#B4651A', '#8A5A11', '#0F7D4F'];

export function getPasswordStrength(password: string): PasswordStrength {
  const checks = [
    password.length >= 12,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = (password.length === 0 ? 0 : checks.filter(Boolean).length) as PasswordStrength['score'];

  return { score, label: LABELS[score], barColor: COLORS[score] };
}

export function isPasswordValid(password: string): boolean {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/.test(password);
}
