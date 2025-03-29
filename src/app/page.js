"use client";

import React, { Suspense } from "react";

import { useIssues } from "@/hooks/useApiQuery";
import { useRetry } from "@/hooks/useRetry";
import Header from "@/components/layout/Header";
import WelcomeBanner from "@/components/layout/WelcomeBanner";
import FilterBar from "@/components/filters/FilterBar";
import IssueList from "@/components/issues/IssueList";
import Card from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Icons";

function IssuesLoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div className="flex items-center gap-3 p-4 rounded-lg border bg-theme-card border-theme">
        <Spinner size="sm" className="text-[var(--element-active)]" />
        <span
          className="text-sm font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          Loading issues and filters...
        </span>
      </div>
    </div>
  );
}

function IssuesContent() {
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
    <>
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
    </>
  );
}

export default function Home() {
  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "rgb(var(--background-rgb))" }}
    >
      <Header />
      <div id="main-content">
        <WelcomeBanner />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <Suspense fallback={<IssuesLoadingFallback />}>
            <IssuesContent />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
