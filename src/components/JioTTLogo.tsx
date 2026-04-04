/** Simple JioTT mark: paddle + ball (matches `public/logo.svg`). */

const BRAND = {
  paddle: "#5e9eff",
  ball: "#a78bfa",
} as const;

export type JioTTLogoProps = {
  size?: number;
  className?: string;
  /** `brand` — app colors; `mono` — `currentColor` (e.g. white on gradient). */
  variant?: "brand" | "mono";
  /** When true, hide from assistive tech (use when a visible title follows). */
  decorative?: boolean;
};

export function JioTTLogo({
  size = 32,
  className,
  variant = "brand",
  decorative = true,
}: JioTTLogoProps) {
  const paddleFill =
    variant === "brand" ? BRAND.paddle : "currentColor";
  const ballFill = variant === "brand" ? BRAND.ball : "currentColor";
  const ballOpacity = variant === "mono" ? 0.8 : 1;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : "JioTT"}
    >
      <rect
        x="10"
        y="9"
        width="13"
        height="30"
        rx="6.5"
        fill={paddleFill}
        opacity={variant === "mono" ? 0.95 : 1}
      />
      <circle
        cx="33"
        cy="24"
        r="9.5"
        fill={ballFill}
        opacity={ballOpacity}
      />
    </svg>
  );
}

/** Centered gradient square + mono logo for auth (and similar) headers. */
export function JioTTAuthMark({ className = "" }: { className?: string }) {
  return (
    <div
      className={`mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary to-primary text-white shadow-lg ${className}`}
    >
      <JioTTLogo size={36} variant="mono" decorative />
    </div>
  );
}
