type MetricCardProps = {
  label: string;
  value: string;
  hint: string;
  tone?: "primary" | "support" | "alert" | "risk";
};

const toneStyles = {
  primary: "text-norteia-primary",
  support: "text-norteia-support",
  alert: "text-norteia-alert",
  risk: "text-norteia-risk",
};

export function MetricCard({
  label,
  value,
  hint,
  tone = "primary",
}: MetricCardProps) {
  return (
    <article className="rounded-2xl border border-norteia-line bg-norteia-card p-4 shadow-soft">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-norteia-muted">
        {label}
      </p>
      <strong
        className={`mt-3 block font-title text-2xl font-bold ${toneStyles[tone]}`}
      >
        {value}
      </strong>
      <p className="mt-2 text-xs leading-5 text-norteia-muted">{hint}</p>
    </article>
  );
}
