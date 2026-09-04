

export default function ReportExportCard({
  eyebrow,
  title,
  description,
  buttonLabel,
  variant = "dark", // "red" | "dark"
  onClick,
  loading = false,
  disabled = false,
}) {
  const btnClass = variant === "red" ? "btn btn-red" : "btn btn-dark";

  return (
    <div
      style={{
        border: "1px solid var(--border-light, #e5e5eb)",
        padding: "2rem",
        background: "var(--bg-primary, #ffffff)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {eyebrow && (
        <div
          className="font-mono text-red"
          style={{ fontSize: "0.75rem", marginBottom: "0.5rem" }}
        >
          {eyebrow}
        </div>
      )}

      <h3
        className="font-display"
        style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "1rem" }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: "0.85rem",
          color: "var(--text-secondary, #55555e)",
          marginBottom: "1.5rem",
          flexGrow: 1,
        }}
      >
        {description}
      </p>

      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={btnClass}
        style={{
          width: "100%",
          opacity: disabled || loading ? 0.6 : 1,
          cursor: disabled || loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "PREPARING…" : buttonLabel}
      </button>
    </div>
  );
}
