import { Spinner } from "./Icons";

export default function Button({
  children,
  onClick,
  loading = false,
  disabled = false,
  className = "",
  variant = "primary",
  size = "md",
  icon = null,
  style = {},
  ...props
}) {
  const variants = {
    primary: {
      className: "bg-indigo-600 hover:bg-indigo-700 text-white",
      style: {},
    },
    secondary: {
      className:
        "hover:bg-[var(--bg-card-hover)] border border-[var(--border-card)]",
      style: { color: "var(--text-secondary)" },
    },
    danger: {
      className: "text-white",
      style: { backgroundColor: "var(--bg-danger)" },
    },
    ghost: {
      className: "hover:bg-[var(--bg-card-hover)]",
      style: { color: "var(--text-secondary)" },
    },
    link: {
      className: "",
      style: { color: "var(--text-secondary)" },
    },
  };

  const sizes = {
    xs: "px-2 py-1 text-xs",
    sm: "px-2.5 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const selectedVariant = variants[variant] || variants.primary;

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`rounded-md ${selectedVariant.className} ${sizes[size]}
        ${loading ? "opacity-70" : ""}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${className}`}
      style={{
        ...selectedVariant.style,
        ...style,
      }}
      {...props}
    >
      <div className="flex items-center justify-center space-x-2">
        {loading && <Spinner size="xs" />}
        {icon && !loading && icon}
        <span>{children}</span>
      </div>
    </button>
  );
}
