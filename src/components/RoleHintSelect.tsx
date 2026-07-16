import { ROLE_HINT_GROUPS, formatRole } from "../lib/roles";

/**
 * Optional "primary role" hint picker for person forms. Real roles are
 * credit-derived; this hint only shows on a person until their first credit
 * exists, so "— none —" is a perfectly good choice. A stored value outside
 * the curated vocabulary (legacy or hand-entered) is kept selectable.
 */
export default function RoleHintSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const known = ROLE_HINT_GROUPS.some((g) => g.roles.includes(value));
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      <option value="">— none —</option>
      {ROLE_HINT_GROUPS.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.roles.map((r) => (
            <option key={r} value={r}>
              {formatRole(r)}
            </option>
          ))}
        </optgroup>
      ))}
      {value && !known && <option value={value}>{formatRole(value)}</option>}
    </select>
  );
}
