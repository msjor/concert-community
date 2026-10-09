"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "password" | "magic";

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();

    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (signUpError) {
        setError(signUpError.message);
      } else {
        setMessage("Check your email to confirm your account, or sign in if confirmations are disabled.");
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
      } else {
        router.push(next);
        router.refresh();
      }
    }

    setLoading(false);
  }

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();

    // Magic link lands on /auth/callback which exchanges the code for a session cookie.
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (otpError) {
      setError(otpError.message);
    } else {
      setMessage("Magic link sent — check your inbox.");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2" role="tablist" aria-label="Auth method">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "password"}
          onClick={() => setMode("password")}
          className={`min-h-11 flex-1 rounded-md text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson ${
            mode === "password"
              ? "bg-crimson text-white"
              : "border border-zinc-700 text-zinc-300"
          }`}
        >
          Email & password
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "magic"}
          onClick={() => setMode("magic")}
          className={`min-h-11 flex-1 rounded-md text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson ${
            mode === "magic"
              ? "bg-crimson text-white"
              : "border border-zinc-700 text-zinc-300"
          }`}
        >
          Magic link
        </button>
      </div>

      {mode === "password" ? (
        <form onSubmit={handlePassword} className="space-y-4">
          <label className="block space-y-1 text-sm text-zinc-400">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
            />
          </label>
          <label className="block space-y-1 text-sm text-zinc-400">
            Password
            <input
              type="password"
              required
              minLength={6}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="min-h-11 w-full rounded-md bg-crimson text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson disabled:opacity-60"
          >
            {loading ? "Working…" : isSignUp ? "Create account" : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp((v) => !v)}
            className="w-full text-sm text-zinc-400 underline-offset-2 hover:underline"
          >
            {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleMagic} className="space-y-4">
          <label className="block space-y-1 text-sm text-zinc-400">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="min-h-11 w-full rounded-md bg-crimson text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send magic link"}
          </button>
        </form>
      )}

      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
