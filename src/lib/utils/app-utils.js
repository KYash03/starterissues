const formatters = {
  date: (value) => {
    if (value == null) return "";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / 86400000);

    if (diffTime < 60000)
      return diffTime < 1000
        ? "Just now"
        : `${Math.floor(diffTime / 1000)}s ago`;
    if (diffTime < 3600000) return `${Math.floor(diffTime / 60000)}m ago`;
    if (diffTime < 86400000) return `${Math.floor(diffTime / 3600000)}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  },

  number: (value) =>
    value >= 1000000
      ? `${(value / 1000000).toFixed(1)}M`
      : value >= 1000
      ? `${(value / 1000).toFixed(1)}k`
      : value.toString(),
};

function formatValue(value, type) {
  if (value == null) return "";
  return formatters[type] ? formatters[type](value) : String(value);
}

function formatDate(dateString) {
  return formatValue(dateString, "date");
}

function formatNumber(num) {
  return formatValue(num, "number");
}

const classNames = (...classes) => classes.filter(Boolean).join(" ");

function validateStarInputs(inputs) {
  const { STAR_FILTERS } = require("@/lib/constants/app");
  const min = parseInt(inputs.minStars, 10);
  const maxInput =
    inputs.maxStars === ""
      ? STAR_FILTERS.DEFAULT_MAX_STARS
      : parseInt(inputs.maxStars, 10);

  if (isNaN(min) || min < STAR_FILTERS.DEFAULT_MIN_STARS) {
    return {
      ...inputs,
      error: `Minimum stars must be at least ${STAR_FILTERS.DEFAULT_MIN_STARS}`,
    };
  }

  if (inputs.maxStars !== "" && (isNaN(maxInput) || maxInput <= 0)) {
    return { ...inputs, error: "Maximum stars must be a positive number" };
  }

  if (inputs.maxStars !== "" && maxInput > STAR_FILTERS.DEFAULT_MAX_STARS) {
    return { ...inputs, error: "Maximum stars cannot exceed 500000" };
  }

  if (inputs.maxStars !== "" && min > maxInput) {
    return {
      ...inputs,
      error: "Minimum stars cannot be greater than maximum stars",
    };
  }

  return { ...inputs, error: null };
}

function getStarsFilterLabel(minStars, maxStars) {
  const { STAR_FILTERS } = require("@/lib/constants/app");

  if (
    minStars === STAR_FILTERS.DEFAULT_MIN_STARS &&
    maxStars === STAR_FILTERS.DEFAULT_MAX_STARS
  ) {
    return "Stars: Any";
  } else if (maxStars === STAR_FILTERS.DEFAULT_MAX_STARS) {
    return `Stars: ${minStars}+`;
  }
  return `Stars: ${minStars}-${maxStars}`;
}

function filterOptionsBySearch(options, searchQuery, selectedItems) {
  if (!searchQuery) {
    if (selectedItems.length > 0) {
      const selectedSet = new Set(selectedItems);
      const selectedOpts = options.filter((opt) => selectedSet.has(opt.value));
      const unselectedOpts = options.filter(
        (opt) => !selectedSet.has(opt.value)
      );
      return [...selectedOpts, ...unselectedOpts];
    }
    return options;
  }

  const query = searchQuery.toLowerCase();
  const startsWith = [];
  const includes = [];

  for (const option of options) {
    const label = option.label.toLowerCase();
    if (label.startsWith(query)) {
      startsWith.push(option);
    } else if (label.includes(query)) {
      includes.push(option);
    }
  }

  return [...startsWith, ...includes];
}

function handleApiError(context, error, details = {}) {
  if (error?.name === "AbortError") return null;
  console.error(`API error in ${context}:`, error, details);
  return getFriendlyErrorMessage(error);
}

function getFriendlyErrorMessage(error) {
  const message = typeof error === "string" ? error : error?.message || "";

  if (message.match(/network|connect|abort/i))
    return "Network connection issue.";
  if (message.includes("timeout")) return "Request timed out.";
  if (message.match(/unauthorized|401/i))
    return "Authentication failed. Please try again.";

  return typeof error === "string"
    ? error
    : error?.message || "An error occurred. Please try again later.";
}

module.exports = {
  formatDate,
  formatNumber,
  formatValue,
  classNames,
  validateStarInputs,
  getStarsFilterLabel,
  filterOptionsBySearch,
  handleApiError,
  getFriendlyErrorMessage,
};
