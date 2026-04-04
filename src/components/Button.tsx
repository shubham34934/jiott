import { forwardRef, ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
      primary:
        "bg-primary text-white shadow-[0_0_20px_-4px_rgba(94,158,255,0.5)] hover:bg-primary-light",
      secondary:
        "bg-surface-raised text-text-primary border border-border hover:bg-surface-overlay",
      ghost: "text-primary hover:bg-primary/12",
    };

    const sizes = {
      sm: "h-9 px-3 text-sm",
      md: "h-11 px-4 text-sm",
      lg: "h-12 px-5 text-base",
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${
          fullWidth ? "w-full" : ""
        } ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
