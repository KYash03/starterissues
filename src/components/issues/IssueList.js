import { memo } from "react";
import IssueCard from "./IssueCard";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { Spinner } from "../ui/Icons";

const MemoizedIssueCard = memo(IssueCard);

const LoadMoreButton = memo(({ loading, hasMore, onClick }) => {
  if (!hasMore) return null;

  return (
    <div className="flex justify-center" style={{ minHeight: "36px" }}>
      {loading ? (
        <div className="py-1">
          <Spinner size="lg" className="text-[var(--element-active)]" />
        </div>
      ) : (
        <Button
          onClick={onClick}
          variant="primary"
          size="md"
          className="cursor-pointer"
        >
          Load More Issues
        </Button>
      )}
    </div>
  );
});

const LoadingIndicator = ({ size = "lg" }) => {
  const isSmall = size === "sm";

  return (
    <div
      className={`flex justify-center items-center ${
        isSmall ? "py-1" : "py-12"
      }`}
    >
      <div className="flex flex-col items-center">
        <div
          className={`${
            isSmall ? "w-8 h-8" : "w-16 h-16"
          } rounded-full flex items-center justify-center ${
            isSmall ? "" : "mb-4"
          }`}
          style={{ backgroundColor: "var(--element-active-light)" }}
        >
          <Spinner
            size={isSmall ? "sm" : "xl"}
            className="text-[var(--element-active)]"
          />
        </div>
        {!isSmall && (
          <p
            style={{ color: "var(--text-secondary)" }}
            className="text-sm font-medium"
          >
            Loading issues...
          </p>
        )}
      </div>
    </div>
  );
};

const FilteringIndicator = () => (
  <div
    className="fixed top-0 left-0 right-0 flex justify-center z-50 pointer-events-none animate-fade-in"
    style={{
      marginTop: "calc(var(--header-height-desktop) + 16px)",
    }}
  >
    <div className="bg-[var(--bg-card)] shadow-lg rounded-lg p-3 flex items-center gap-2 border border-[var(--border-card)]">
      <Spinner size="sm" className="text-[var(--element-active)]" />
      <span
        className="animate-pulse-subtle"
        style={{
          color: "var(--text-secondary)",
          animation: "pulse-text 2s infinite ease-in-out",
        }}
      >
        Filtering issues...
      </span>
    </div>
  </div>
);

const IssueList = ({
  issues = [],
  loading = false,
  isFiltering = false,
  pagination = { hasMore: false },
  filters = {},
  onLoadMore,
  onResetFilters,
}) => {
  const isInitialLoad = loading && issues.length === 0 && !isFiltering;

  if (!loading && issues.length === 0) {
    return (
      <Card
        variant="empty"
        title="No matching issues found"
        filters={filters}
        action={onResetFilters}
      />
    );
  }

  const contentStyle = isFiltering
    ? {
        transition: "filter 0.15s ease, opacity 0.15s ease",
        pointerEvents: "none",
      }
    : {
        transition: "filter 0.15s ease, opacity 0.15s ease",
      };

  return (
    <div aria-live="polite" aria-busy={loading}>
      {isFiltering && <FilteringIndicator />}

      {isInitialLoad ? (
        <LoadingIndicator size="lg" />
      ) : (
        <div className="space-y-6 mb-6">
          <div
            className="grid grid-cols-1 gap-4 staggered-animation"
            role="feed"
            aria-label="GitHub Issues"
            style={contentStyle}
          >
            {issues.map((issue) => (
              <MemoizedIssueCard key={issue.github_id} issue={issue} />
            ))}
          </div>

          {pagination.hasMore && (
            <LoadMoreButton
              loading={loading && !isFiltering}
              hasMore={pagination.hasMore}
              onClick={onLoadMore}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default memo(IssueList);
