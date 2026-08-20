import { cn } from "@/lib/utils";

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  type = "button",
  disabled = false,
  onClick,
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer select-none";

  const sizeStyles = {
    sm: "text-xs px-2.5 py-1.5 gap-1.5",
    md: "text-xs sm:text-sm px-3.5 py-2 gap-2",
    lg: "text-sm px-4 py-2.5 gap-2",
    icon: "p-2 min-h-[36px] min-w-[36px]",
  };

  const variantStyles = {
    primary:
      "bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-600 shadow-xs",
    emerald:
      "bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-600 shadow-xs",
    secondary:
      "bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 shadow-xs",
    ghost:
      "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100",
    danger:
      "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 hover:border-rose-300",
    "danger-solid":
      "bg-rose-600 text-white hover:bg-rose-700 border border-rose-600 shadow-xs",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}
