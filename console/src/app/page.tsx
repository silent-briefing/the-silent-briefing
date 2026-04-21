export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 py-16">
      <h1 className="font-serif text-4xl font-semibold tracking-tight text-primary md:text-5xl">
        The Silent Briefing
      </h1>
      <p className="mt-6 max-w-xl text-center font-sans text-lg leading-relaxed text-[var(--fg-3)]">
        Operator console foundation — design tokens, Clerk auth, and Supabase wiring ship in Phase A.
      </p>
    </main>
  );
}
