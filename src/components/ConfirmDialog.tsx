"use client";

import { useEffect, useId } from "react";
import { Button } from "@/components/Button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isPending?: boolean;
  variant?: "danger" | "default";
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  isPending = false,
  variant = "default",
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, isPending]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const confirmIsDanger = variant === "danger";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
        aria-label="Dismiss"
        disabled={isPending}
        onClick={() => !isPending && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-border-strong bg-surface-raised p-5 shadow-2xl shadow-black/40 ring-1 ring-white/[0.04]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-bold text-text-primary">
          {title}
        </h2>
        <p id={descId} className="mt-2 text-sm text-neutral">
          {description}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            className="sm:w-auto sm:min-w-[100px]"
            disabled={isPending}
            onClick={onClose}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmIsDanger ? "secondary" : "primary"}
            fullWidth
            className={
              confirmIsDanger
                ? "sm:w-auto sm:min-w-[100px] border-danger/45 text-danger hover:bg-danger/12"
                : "sm:w-auto sm:min-w-[100px]"
            }
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? "Please wait…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
