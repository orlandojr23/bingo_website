"use client";

const LEVELS = [
  { label: "Very weak", text: "text-rose-500", bar: "bg-rose-500", width: "w-1/4" },
  { label: "Weak", text: "text-orange-500", bar: "bg-orange-400", width: "w-2/4" },
  { label: "Good", text: "text-amber-500", bar: "bg-amber-400", width: "w-3/4" },
  { label: "Strong", text: "text-emerald-600", bar: "bg-emerald-500", width: "w-full" },
];

export function passwordStrength(password = "") {
  if (!password) return null;
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  const classes =
    (/[a-z]/.test(password) ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/\d/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0);
  if (classes >= 2) score++;
  if (classes >= 4) score++;
  return LEVELS[Math.max(0, Math.min(score - 1, LEVELS.length - 1))];
}

export default function PasswordStrengthHint({ password }) {
  const level = passwordStrength(password);
  if (!level) return null;
  return (
    <div className="mt-1.5 flex items-center gap-2" data-testid="password-strength">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full transition-all duration-300 ${level.bar} ${level.width}`}
        />
      </div>
      <span className={`text-[10px] font-semibold ${level.text}`}>{level.label}</span>
    </div>
  );
}
