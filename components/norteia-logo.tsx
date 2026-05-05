export function NorteiaLogo() {
  return (
    <div className="inline-flex items-center gap-3" aria-label="Norteia">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-norteia-primary/35 bg-norteia-primary/10 shadow-glow">
        <span className="font-title text-xl font-bold leading-none text-norteia-primary">
          N
        </span>
        <span className="absolute right-2 top-2 h-3 w-3 border-r-2 border-t-2 border-norteia-primary" />
      </div>
      <span className="font-title text-xl font-bold tracking-[0.02em] text-norteia-text">
        Norteia
      </span>
    </div>
  );
}
