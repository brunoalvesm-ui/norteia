type AlertTone = "support" | "alert" | "risk" | "primary";

type AlertCardProps = {
  title: string;
  description: string;
  tone?: AlertTone;
};

const toneStyles: Record<AlertTone, string> = {
  support: "border-norteia-support/35 bg-norteia-support/10 text-norteia-support",
  alert: "border-norteia-alert/35 bg-norteia-alert/10 text-norteia-alert",
  risk: "border-norteia-risk/35 bg-norteia-risk/10 text-norteia-risk",
  primary: "border-norteia-primary/35 bg-norteia-primary/10 text-norteia-primary",
};

export function AlertCard({
  title,
  description,
  tone = "primary",
}: AlertCardProps) {
  return (
    <aside className={`rounded-2xl border p-4 ${toneStyles[tone]}`}>
      <p className="text-xs font-bold uppercase tracking-[0.16em]">
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-norteia-text/78">
        {description}
      </p>
    </aside>
  );
}
