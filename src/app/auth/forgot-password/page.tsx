"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/Button";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setSent(true);
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-5 py-10">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">📬</div>
          <h1 className="text-2xl font-bold text-text-primary">Check your inbox</h1>
          <p className="text-sm text-neutral mt-2 max-w-xs">
            If an account exists for{" "}
            <span className="font-semibold text-text-primary">{email}</span>,
            you&apos;ll receive a reset code shortly.
          </p>
        </div>
        <Button
          fullWidth
          size="lg"
          className="max-w-sm"
          onClick={() =>
            router.push(
              `/auth/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`
            )
          }
        >
          Enter reset code
        </Button>
        <Link
          href="/auth/signin"
          className="block text-center text-sm text-primary font-semibold mt-4"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-5 py-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary to-primary mb-4 text-3xl shadow-lg">
          🔑
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Forgot password?</h1>
        <p className="text-sm text-neutral mt-1 max-w-xs">
          Enter your email and we&apos;ll send you a reset code.
        </p>
      </div>

      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
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

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? "Sending code..." : "Send reset code"}
          </Button>
        </form>

        <Link
          href="/auth/signin"
          className="flex items-center justify-center gap-2 text-sm text-neutral mt-6 font-medium"
        >
          <ArrowLeft size={16} />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
