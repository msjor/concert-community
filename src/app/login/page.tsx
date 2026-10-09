import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { PageShell } from "@/components/PageShell";

export const metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-md space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-zinc-50">Sign in</h1>
          <p className="text-sm text-zinc-400">
            Use email/password or a magic link. Guests can still browse shows.
          </p>
        </header>
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
          <AuthForm />
        </Suspense>
      </div>
    </PageShell>
  );
}
