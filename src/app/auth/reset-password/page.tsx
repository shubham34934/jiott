"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/Button";
import { JioTTAuthMark } from "@/components/JioTTLogo";
import { authClient } from "@/lib/auth-client";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      router.replace("/auth/forgot-password");
      return;
    }
    inputRefs.current[0]?.focus();
  }, [email, router]);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const handleDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError("");
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) setCode(pasted.split(""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (code.join("").length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await authClient.emailOtp.resetPassword({
      email,
      otp: code.join(""),
      password,
    });
    setLoading(false);

    if (error) {
      const msg =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: string }).message)
          : "Reset failed.";
      setError(msg);
      if (/expired|invalid/i.test(msg)) {
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/auth/signin"), 2000);
  };

  const handleResend = async () => {
    setResending(true);
    const { error } = await authClient.forgetPassword.emailOtp({ email });
    setResending(false);
    if (!error) {
      setCountdown(60);
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-5 py-10 text-center">
        <CheckCircle2 size={56} className="text-success mb-4" />
        <h2 className="text-xl font-bold text-text-primary">Password reset!</h2>
        <p className="text-sm text-neutral mt-2">Redirecting you to sign in...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-5 py-10">
      <div className="text-center mb-8">
        <JioTTAuthMark />
        <h1 className="text-2xl font-bold text-text-primary">Reset password</h1>
        <p className="text-sm text-neutral mt-1 max-w-xs">
          Enter the code sent to{" "}
          <span className="font-semibold text-text-primary">{email}</span> and your new password.
        </p>
      </div>

      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* OTP */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Reset code
            </label>
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={`w-11 h-13 text-center text-xl font-bold bg-surface border-2 rounded-xl focus:outline-none transition-all ${
                    digit ? "border-primary text-primary" : "border-border"
                  } focus:border-primary focus:ring-2 focus:ring-primary/20`}
                />
              ))}
            </div>
            <div className="text-center mt-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || countdown > 0}
                className="text-xs text-primary font-medium disabled:text-neutral"
              >
                {resending ? "Sending..." : countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              New password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
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

          {/* Confirm */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Confirm password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral" />
              <input
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                required
                className={`w-full h-11 pl-10 pr-4 bg-surface border rounded-xl text-sm placeholder:text-neutral-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                  confirm && confirm !== password ? "border-danger" : "border-border"
                }`}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-danger/35 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? "Resetting..." : "Reset password"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
