"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, MessageSquareHeart } from "lucide-react";
import { Button } from "@/components/Button";
import { authClient } from "@/lib/auth-client";

const categories = [
  { value: "GENERAL", label: "General" },
  { value: "BUG", label: "Bug report" },
  { value: "FEATURE", label: "Feature idea" },
] as const;

export default function FeedbackPage() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const [category, setCategory] = useState<(typeof categories)[number]["value"]>("GENERAL");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message: message.trim(),
          pagePath: pathname || undefined,
          ...(!session ? { contactEmail: contactEmail.trim() || undefined } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setStatus("error");
        return;
      }
      setStatus("done");
      setMessage("");
      setContactEmail("");
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="px-4 pt-6 pb-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-neutral hover:text-primary mb-6"
      >
        <ArrowLeft size={18} />
        Back
      </Link>

      <div className="flex items-start gap-3 mb-6">
        <div className="rounded-xl bg-primary/15 p-3 text-primary">
          <MessageSquareHeart size={28} strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Feedback</h1>
          <p className="text-sm text-neutral mt-1">
            Tell us what works, what does not, or what you would like next.
            {session?.user?.email ? (
              <span className="block mt-1 text-neutral-light">
                Sending as {session.user.email}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {status === "done" ? (
        <div className="rounded-2xl border border-border bg-surface p-6 text-center">
          <p className="text-text-primary font-semibold mb-2">Thanks for your feedback</p>
          <p className="text-sm text-neutral mb-6">
            We read every message and use it to improve JioTT.
          </p>
          <Link href="/">
            <Button fullWidth>Back to home</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
          <div>
            <label htmlFor="fb-category" className="block text-sm font-medium text-text-primary mb-2">
              Type
            </label>
            <select
              id="fb-category"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as (typeof categories)[number]["value"])
              }
              className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-text-primary outline-none focus:ring-2 focus:ring-primary/40"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="fb-message" className="block text-sm font-medium text-text-primary mb-2">
              Message
            </label>
            <textarea
              id="fb-message"
              required
              rows={6}
              maxLength={5000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What would you like us to know?"
              className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-text-primary placeholder:text-neutral-light outline-none focus:ring-2 focus:ring-primary/40 resize-y min-h-[140px]"
            />
            <p className="text-xs text-neutral mt-1.5 text-right">
              {message.length} / 5000
            </p>
          </div>

          {!session ? (
            <div>
              <label htmlFor="fb-email" className="block text-sm font-medium text-text-primary mb-2">
                Email <span className="text-neutral font-normal">(optional)</span>
              </label>
              <input
                id="fb-email"
                type="email"
                autoComplete="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="So we can reply if needed"
                className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-text-primary placeholder:text-neutral-light outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          ) : null}

          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" fullWidth size="lg" disabled={status === "sending" || !message.trim()}>
            {status === "sending" ? "Sending…" : "Send feedback"}
          </Button>
        </form>
      )}
    </div>
  );
}
