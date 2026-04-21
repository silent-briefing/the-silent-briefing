import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </main>
  );
}
