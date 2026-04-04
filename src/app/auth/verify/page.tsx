"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";
import { CheckCircle2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [verified, setVerified] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      router.replace("/auth/register");
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

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (digit && index === 5) {
      const fullCode = [...newCode].join("");
      if (fullCode.length === 6) handleVerify(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      handleVerify(pasted);
    }
  };

  const handleVerify = async (fullCode?: string) => {
    const otp = fullCode || code.join("");
    if (otp.length !== 6) {
      setError("Please enter all 6 digits.");
      return;
    }

    setLoading(true);
    setError("");

    const { error } = await authClient.emailOtp.verifyEmail({
      email,
      otp,
    });

    if (error) {
      setLoading(false);
      setError(
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: string }).message)
          : "Invalid or expired code."
      );
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      return;
    }

    setVerified(true);
    setTimeout(() => router.push("/auth/signin?callbackUrl=/"), 2000);
  };

  const handleResend = async () => {
    setResending(true);
    setResendMsg("");
    setError("");

    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "email-verification",
    });
    setResending(false);

    if (error) {
      setError(
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: string }).message)
          : "Could not resend code."
      );
      return;
    }

    setResendMsg("New code sent!");
    setCountdown(60);
    setCode(["", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();
  };

  if (verified) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-5 py-10 text-center">
        <CheckCircle2 size={56} className="text-success mb-4" />
        <h2 className="text-xl font-bold text-text-primary">Email verified!</h2>
        <p className="text-sm text-neutral mt-2">Redirecting you to sign in...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-5 py-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary to-primary mb-4 text-3xl shadow-lg">
          📧
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Check your email</h1>
        <p className="text-sm text-neutral mt-2 max-w-xs">
          We sent a 6-digit code to{" "}
          <span className="font-semibold text-text-primary">{email}</span>
        </p>
      </div>

      <div className="w-full max-w-sm">
        {/* OTP Input */}
        <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
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
              className={`w-12 h-14 text-center text-2xl font-bold bg-surface border-2 rounded-xl focus:outline-none transition-all ${
                digit
                  ? "border-primary text-primary"
                  : "border-border text-text-primary"
              } ${error ? "border-danger" : ""} focus:border-primary focus:ring-2 focus:ring-primary/20`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-danger mb-4 text-center">
            {error}
          </div>
        )}

        {/* Success resend msg */}
        {resendMsg && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-success mb-4 text-center flex items-center justify-center gap-2">
            <CheckCircle2 size={16} />
            {resendMsg}
          </div>
        )}

        <Button
          fullWidth
          size="lg"
          disabled={loading || code.join("").length !== 6}
          onClick={() => handleVerify()}
        >
          {loading ? "Verifying..." : "Verify email"}
        </Button>

        <div className="text-center mt-4">
          <p className="text-sm text-neutral mb-2">Didn&apos;t receive the code?</p>
          <button
            onClick={handleResend}
            disabled={resending || countdown > 0}
            className="text-sm font-semibold text-primary disabled:text-neutral disabled:cursor-not-allowed"
          >
            {resending
              ? "Sending..."
              : countdown > 0
              ? `Resend in ${countdown}s`
              : "Resend code"}
          </button>
        </div>

        <p className="text-xs text-neutral text-center mt-6">
          The code expires in 10 minutes. Check your spam folder if you don&apos;t see it.
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
