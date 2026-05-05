type PageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
};

export function PageShell({
  eyebrow,
  title,
  description,
  children,
}: PageShellProps) {
  return (
    <section className="space-y-7">
      <header className="space-y-3 pt-2">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-norteia-primary">
          {eyebrow}
        </p>
        <h1 className="font-title text-3xl font-bold leading-tight text-norteia-text">
          {title}
        </h1>
        <p className="max-w-xl text-sm leading-6 text-norteia-muted">
          {description}
        </p>
      </header>

      <div className="space-y-4">{children}</div>
    </section>
  );
}
