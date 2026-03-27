import Link from "next/link";

export function Footer() {
  return (
    <footer className="text-center py-4 px-4 border-t border-border mt-8">
      <p className="text-xs font-semibold text-text-primary mb-1">JioTT</p>
      <p className="text-xs text-neutral mb-2">
        Table Tennis Match Tracker
      </p>
      <div className="flex items-center justify-center gap-4 text-xs text-neutral">
        <Link href="/privacy" className="hover:text-primary underline">
          Privacy Policy
        </Link>
        <span>·</span>
        <Link href="/terms" className="hover:text-primary underline">
          Terms of Service
        </Link>
      </div>
    </footer>
  );
}
