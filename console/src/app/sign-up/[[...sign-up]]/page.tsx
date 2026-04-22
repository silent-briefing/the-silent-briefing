import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main
      id="site-main"
      tabIndex={-1}
      className="flex min-h-screen items-center justify-center bg-surface px-4 outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-inset"
    >
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </main>
  );
}
