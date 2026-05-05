import Link from "next/link";

type ActionButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
};

export function ActionButton({
  href,
  children,
  variant = "primary",
}: ActionButtonProps) {
  const styles =
    variant === "primary"
      ? "bg-norteia-primary text-norteia-bg shadow-glow"
      : "border border-norteia-line bg-norteia-card-2 text-norteia-text";

  return (
    <Link
      href={href}
      className={`inline-flex h-12 items-center justify-center rounded-2xl px-5 text-sm font-bold transition ${styles}`}
    >
      {children}
    </Link>
  );
}
