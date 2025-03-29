import React from "react";
import Button from "./Button";
import { Icon } from "./Icons";
import { STAR_FILTERS } from "@/lib/constants/app";
import { getFriendlyErrorMessage } from "@/lib/utils/app-utils";

export default function Card({
  children,
  className = "",
  onClick = null,
  as = "article",
  variant = "default",
  title,
  message,
  action,
  filters,
  errorDetails,
  ...props
}) {
  const Component = as;

  const cardClasses = [
    "rounded-xl",
    "border p-4 sm:p-5",
    onClick && "cursor-pointer",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const baseStyle = {
    backgroundColor: "var(--bg-card)",
    borderColor: "var(--border-card)",
    color: "var(--text-primary)",
  };

  if (variant === "empty") {
    const hasActiveFilters =
      filters &&
      (filters.languages?.length > 0 ||
        filters.repositories?.length > 0 ||
        filters.labels?.length > 0 ||
        filters.minStars !== STAR_FILTERS.DEFAULT_MIN_STARS ||
        filters.maxStars !== STAR_FILTERS.DEFAULT_MAX_STARS ||
        filters.noAssignee);

    return (
      <Component
        className={`${cardClasses} my-6 flex flex-col items-center justify-center text-center py-16 px-4 animate-scale-fade`}
        style={baseStyle}
        role="status"
        aria-live="polite"
        {...props}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6 border"
          style={{
            backgroundColor: "var(--bg-card-hover)",
            borderColor: "var(--border-card)",
          }}
        >
          <svg
            className="h-10 w-10"
            style={{ color: "var(--text-secondary)" }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3
          className="text-2xl font-bold mb-3"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h3>
        <p className="max-w-md mb-8" style={{ color: "var(--text-secondary)" }}>
          {message ||
            (hasActiveFilters
              ? "No issues match the current filters. Try adjusting search criteria to find more results."
              : "No issues found. Try using different search criteria.")}
        </p>
      </Component>
    );
  }

  if (variant === "error") {
    const friendlyError = errorDetails
      ? getFriendlyErrorMessage(errorDetails)
      : null;

    return (
      <Component
        className={`${cardClasses} my-6 bg-red-900/20 border border-red-800/50 p-5 sm:p-6 animate-scale-fade`}
        style={{
          ...baseStyle,
          backgroundColor: "var(--text-danger-light)",
          borderColor: "var(--text-danger)",
        }}
        role="alert"
        aria-live="assertive"
        {...props}
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-shrink-0">
            <Icon
              name="error"
              className="h-6 w-6"
              style={{ color: "var(--text-danger)" }}
            />
          </div>
          <div className="flex-1">
            <h3
              className="text-lg font-medium"
              style={{ color: "var(--text-danger)" }}
            >
              {title}
            </h3>
            <p
              className="mt-2 text-sm mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              {friendlyError}
            </p>
            {action && (
              <Button
                onClick={action.handler}
                disabled={action.isRetrying || action.countdown > 0}
                variant="danger"
                loading={action.isRetrying}
                className="cursor-pointer"
              >
                {action.isRetrying
                  ? "Retrying..."
                  : action.countdown > 0
                  ? `Try Again in ${action.countdown}s`
                  : "Try Again"}
              </Button>
            )}
          </div>
        </div>
      </Component>
    );
  }

  return (
    <Component
      className={cardClasses}
      style={baseStyle}
      onClick={onClick}
      {...props}
    >
      {children}
    </Component>
  );
}
