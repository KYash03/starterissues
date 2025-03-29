import React from "react";
import {
  FiArrowUp,
  FiCalendar,
  FiCheck,
  FiCode,
  FiExternalLink,
  FiGithub,
  FiMessageCircle,
  FiRefreshCw,
  FiSearch,
  FiStar,
  FiTag,
  FiUser,
  FiX,
  FiAlertCircle,
  FiMenu,
  FiChevronDown,
  FiBookmark,
} from "react-icons/fi";
import { GoRepo } from "react-icons/go";
import { BsSortDown } from "react-icons/bs";

const ICON_MAP = {
  sort: BsSortDown,
  star: FiStar,
  check: FiCheck,
  close: FiX,
  bookmark: FiBookmark,
  user: FiUser,
  code: FiCode,
  repository: GoRepo,
  label: FiTag,
  menuOpen: FiX,
  menuClosed: FiMenu,
  calendar: FiCalendar,
  refresh: FiRefreshCw,
  search: FiSearch,
  chevronDown: FiChevronDown,
  error: FiAlertCircle,
  scrollTop: FiArrowUp,
  comment: FiMessageCircle,
  githubRepo: FiGithub,
};

export const iconSizes = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
  xl: "w-8 h-8",
};

export const Icon = ({ name, size, className = "", ...props }) => {
  const IconComponent = ICON_MAP[name] || FiExternalLink;
  const sizeClass = size ? iconSizes[size] : iconSizes.sm;

  const sizeValue = parseInt(sizeClass.match(/w-(\d+)/)?.[1] || 4) * 4;

  return (
    <IconComponent
      size={sizeValue}
      className={`${className}`}
      stroke="currentColor"
      {...props}
    />
  );
};

export const GitHubIcon = ({ className = "mr-1.5" }) => {
  return <FiGithub className={className} size={14} />;
};

export const Spinner = ({ size = "sm", className = "" }) => {
  const sizeClass = size ? iconSizes[size] : iconSizes.sm;

  return (
    <svg
      className={`animate-spin ${sizeClass} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
};
