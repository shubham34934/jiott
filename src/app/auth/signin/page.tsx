"use client";

import { useEffect, useState, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { safeReturnPath } from "@/lib/safe-return-path";
import { waitForAuthSessionClient } from "@/lib/wait-for-auth-session-client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Button } from "@/components/Button";
import { JioTTAuthMark } from "@/components/JioTTLogo";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo =
    safeReturnPath(searchParams.get("callbackUrl")) ?? "/profile";
  const { status } = useSession();

  // If the session fetch on page load reports an existing user, skip the form.
  useEffect(() => {
    if (status === "authenticated") {
      router.replace(returnTo);
    }
  }, [status, returnTo, router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Pre-check: does the email even exist? NextAuth's CredentialsSignin
      // error code doesn't always propagate to the client reliably, so we
      // disambiguate "no account" vs "wrong password" on our own.
      const checkRes = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const { exists, verified } = (await checkRes
        .json()
        .catch(() => ({ exists: false, verified: false }))) as {
        exists: boolean;
        verified: boolean;
      };
      if (!exists) {
        setLoading(false);
        setError(
          "No account found with this email. Please register first."
        );
        return;
      }
      if (!verified) {
        setLoading(false);
        router.push(
          `/auth/verify?email=${encodeURIComponent(normalizedEmail)}`
        );
        return;
      }

      const res = await signIn("credentials", {
        email: normalizedEmail,
        password,
        redirect: false,
        callbackUrl: returnTo,
      });

      // NextAuth v5 beta can return { ok: true, error: "CredentialsSignin" }
      // on a failed credentials sign-in — treat any `error` as failure.
      const failed = !res || !res.ok || !!res.error;
      if (failed) {
        setLoading(false);
        setError("Wrong password. Please try again.");
        return;
      }

      await waitForAuthSessionClient();
      setLoading(false);
      window.location.assign(returnTo);
    } catch {
      setLoading(false);
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-5 py-10">
      {/* Logo */}
      <div className="text-center mb-8">
        <JioTTAuthMark />
        <h1 className="text-2xl font-bold text-text-primary">Welcome back</h1>
        <p className="text-sm text-neutral mt-1">Sign in to your JioTT account</p>
      </div>

      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Email address
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                className="w-full h-11 pl-10 pr-4 bg-surface border border-border rounded-xl text-sm placeholder:text-neutral-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-text-primary">
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-primary font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full h-11 pl-10 pr-11 bg-surface border border-border rounded-xl text-sm placeholder:text-neutral-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-danger/35 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="text-center text-sm text-neutral mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="text-primary font-semibold">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
