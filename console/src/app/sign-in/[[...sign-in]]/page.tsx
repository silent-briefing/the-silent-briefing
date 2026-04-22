import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main
      id="site-main"
      tabIndex={-1}
      className="flex min-h-screen items-center justify-center bg-surface px-4 outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-inset"
    >
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </main>
  );
}
