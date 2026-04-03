import { CheckCircle2, Clock, Lock } from "lucide-react";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case "CREATED":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral bg-gray-100 rounded-full px-2.5 py-1">
          Draft
        </span>
      );
    case "IN_PROGRESS":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-blue-50 rounded-full px-2.5 py-1">
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
    case "READY":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-blue-50 rounded-full px-2.5 py-1">
          Ready
        </span>
      );
    case "LOCKED":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral bg-gray-100 rounded-full px-2.5 py-1">
          <Lock size={14} />
          Locked
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral bg-gray-100 rounded-full px-2.5 py-1">
          {status}
        </span>
      );
  }
}
