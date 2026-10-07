/**
 * A small, dependency-free strength heuristic for the sign-up form. It rewards
 * length and character variety and nudges down obvious patterns — enough to
 * steer people away from weak passwords without pretending to be a cracker
 * model. The server still owns the hard minimum (see `passwordField`).
 */

export type PasswordScore = 0 | 1 | 2 | 3 | 4;

export type PasswordStrength = {
  /** 0 means empty; 1 (weak) through 4 (very strong) otherwise. */
  score: PasswordScore;
  /** Localised label, or "" when there's nothing to show. */
  label: string;
};

const LABELS: Record<PasswordScore, string> = {
  0: "",
  1: "Zayıf",
  2: "Orta",
  3: "Güçlü",
  4: "Çok güçlü",
};

export function scorePassword(password: string): PasswordStrength {
  if (!password) return { score: 0, label: LABELS[0] };

  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) =>
    re.test(password),
  ).length;

  let points = 0;
  if (password.length >= 8) points += 1;
  if (password.length >= 12) points += 1;
  if (variety >= 2) points += 1;
  if (variety >= 3) points += 1;

  // A long string of one character class, or a run of repeats, isn't as strong
  // as its length suggests.
  if (password.length < 6) points = Math.min(points, 1);
  if (/(.)\1{2,}/.test(password)) points -= 1;

  const score = Math.max(1, Math.min(4, points)) as PasswordScore;
  return { score, label: LABELS[score] };
}
