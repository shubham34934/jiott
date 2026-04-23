"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export interface BackButtonProps {
  /** Override default icon size. */
  size?: number;
  className?: string;
  label?: string;
}

export function BackButton({
  size = 22,
  className = "p-1",
  label = "Back",
}: BackButtonProps) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={className}
      aria-label={label}
    >
      <ArrowLeft size={size} className="text-text-primary" />
    </button>
  );
}
