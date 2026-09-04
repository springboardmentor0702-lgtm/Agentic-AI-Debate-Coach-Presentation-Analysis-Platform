import { Check, Circle } from "lucide-react";

/**
 * Shared password-requirements definition and checklist UI - used by
 * Register (new account) and EditProfile (change password), so the
 * rules and the visual feedback stay identical in both places instead
 * of drifting apart.
 */
export function getPasswordChecks(password) {
  return [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "One uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "One number", valid: /[0-9]/.test(password) },
  ];
}

export function isPasswordValid(password) {
  return getPasswordChecks(password).every((c) => c.valid);
}

export default function PasswordChecklist({ password }) {
  const checks = getPasswordChecks(password);
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1.5 pl-0.5">
      {checks.map((c) => {
        const Icon = c.valid ? Check : Circle;
        return (
          <li
            key={c.label}
            className={`flex items-center gap-2 text-xs ${c.valid ? "text-ok" : "text-faint"}`}
          >
            <Icon size={13} strokeWidth={c.valid ? 2.5 : 2} />
            {c.label}
          </li>
        );
      })}
    </ul>
  );
}
