/**
 * Purely presentational - forwards every prop (value, onChange, type,
 * required, placeholder, name, rows...) straight onto a real <input>
 * or <textarea>, so it drops into existing controlled-input code with
 * zero logic changes. `label` is optional: pass it for the labeled
 * Login-style fields, or omit it and rely on `placeholder` for the
 * compact Register-style fields, matching what each page already
 * does today. `multiline` (new, defaults to false) renders a
 * <textarea> instead - every existing call site omits it and keeps
 * rendering a plain <input> exactly as before.
 */
export default function GlassField({ label, className = "", multiline = false, ...fieldProps }) {
  const Tag = multiline ? "textarea" : "input";
  const field = (
    <Tag
      {...fieldProps}
      className={`w-full bg-glass border border-glass-border backdrop-blur-xl rounded-xl px-4 py-3 text-base text-ink placeholder:text-faint focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors ${
        multiline ? "resize-y" : ""
      } ${className}`}
    />
  );

  if (!label) return field;

  return (
    <label className="block">
      <span className="block font-mono text-xs text-faint uppercase tracking-wide mb-1.5">{label}</span>
      {field}
    </label>
  );
}
