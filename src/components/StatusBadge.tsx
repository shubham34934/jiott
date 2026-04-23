import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Hourglass,
  Lock,
  MailQuestion,
  XCircle,
} from "lucide-react";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case "CREATED":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral bg-surface-raised rounded-full px-2.5 py-1 ring-1 ring-border">
          Draft
        </span>
      );
    case "IN_PROGRESS":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/15 rounded-full px-2.5 py-1">
          In progress
        </span>
      );
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral bg-background rounded-full px-2.5 py-1">
          <CheckCircle2 size={14} className="text-success" />
          Completed
        </span>
      );
    case "ONGOING":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-success rounded-full px-2.5 py-1">
          <Clock size={14} />
          Ongoing
        </span>
      );
    case "DISPUTED":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warning bg-warning/15 rounded-full px-2.5 py-1">
          <AlertTriangle size={14} className="shrink-0" />
          Disputed
        </span>
      );
    case "AWAITING_ACCEPTANCE":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/15 rounded-full px-2.5 py-1">
          <MailQuestion size={14} className="shrink-0" />
          Awaiting acceptance
        </span>
      );
    case "AWAITING_CONFIRMATION":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warning bg-warning/15 rounded-full px-2.5 py-1">
          <Hourglass size={14} className="shrink-0" />
          Awaiting confirmation
        </span>
      );
    case "DECLINED":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-danger bg-danger/15 rounded-full px-2.5 py-1">
          <XCircle size={14} className="shrink-0" />
          Declined
        </span>
      );
    case "READY":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/15 rounded-full px-2.5 py-1">
          Ready
        </span>
      );
    case "LOCKED":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral bg-surface-raised rounded-full px-2.5 py-1 ring-1 ring-border">
          <Lock size={14} />
          Locked
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral bg-surface-raised rounded-full px-2.5 py-1 ring-1 ring-border">
          {status}
        </span>
      );
  }
}
