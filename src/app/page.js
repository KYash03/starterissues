"use client";
import { useIssues } from "@/hooks/useApiQuery";
import { useRetry } from "@/hooks/useRetry";
import Header from "@/components/layout/Header";
import WelcomeBanner from "@/components/layout/WelcomeBanner";
import FilterBar from "@/components/filters/FilterBar";
import IssueList from "@/components/issues/IssueList";
import Card from "@/components/ui/Card";

export default function Home() {
  const {
    issues,
    loading,
    isFiltering,
    error,
    pagination,
    filters,
    updateFilters,
    loadMore,
    refreshIssues,
    resetFilters,
    getActiveFilterCount,
  } = useIssues();

  const { retry: handleRetry, isRetrying, countdown } = useRetry(refreshIssues);

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "rgb(var(--background-rgb))" }}
    >
      <Header />
      <div id="main-content">
        <WelcomeBanner />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <FilterBar
            filters={filters}
            onFilterChange={updateFilters}
            onResetFilters={resetFilters}
            activeFilterCount={getActiveFilterCount()}
          />
          {error ? (
            <Card
              variant="error"
              title="Error loading issues"
              errorDetails={error}
              action={{
                isRetrying,
                countdown,
                handler: handleRetry,
              }}
            />
          ) : (
            <IssueList
              issues={issues}
              loading={loading}
              isFiltering={isFiltering}
              pagination={pagination}
              filters={filters}
              onLoadMore={loadMore}
              onResetFilters={resetFilters}
            />
          )}
        </div>
      </div>
    </main>
  );
}
