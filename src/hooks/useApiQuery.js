import { useState, useEffect, useCallback, useRef } from "react";
import { buildQueryParams } from "@/lib/api/client";
import { handleApiError } from "@/lib/utils/app-utils";
import { STAR_FILTERS } from "@/lib/constants/app";
import { useAppContext } from "@/context/AppContext";

export const INITIAL_FILTERS = {
  languages: [],
  excludedLanguages: [],
  labels: [],
  excludedLabels: [],
  repositories: [],
  excludedRepositories: [],
  sortBy: "updated_at",
  sortOrder: "desc",
  noAssignee: false,
  minStars: STAR_FILTERS.DEFAULT_MIN_STARS,
  maxStars: STAR_FILTERS.DEFAULT_MAX_STARS,
  bookmarkedOnly: false,
};

const validateAndNormalizeFilters = (newFilters, currentFilters) => {
  const result = { ...currentFilters };
  Object.entries(newFilters).forEach(([key, value]) => {
    switch (key) {
      case "languages":
      case "excludedLanguages":
      case "repositories":
      case "excludedRepositories":
      case "labels":
      case "excludedLabels":
        result[key] = Array.isArray(value) ? value : [];
        break;
      case "minStars": {
        const minStars = parseInt(value, 10);
        result.minStars = isNaN(minStars) ? 0 : Math.max(0, minStars);
        if (
          result.maxStars !== STAR_FILTERS.DEFAULT_MAX_STARS &&
          result.minStars > result.maxStars
        ) {
          result.maxStars = result.minStars;
        }
        break;
      }
      case "maxStars": {
        if (value === "" || value === null || value === undefined) {
          result.maxStars = STAR_FILTERS.DEFAULT_MAX_STARS;
        } else {
          const maxStars = parseInt(value, 10);
          result.maxStars = isNaN(maxStars)
            ? STAR_FILTERS.DEFAULT_MAX_STARS
            : Math.max(0, maxStars);
          if (result.minStars > result.maxStars) {
            result.minStars = result.maxStars;
          }
        }
        break;
      }
      case "noAssignee":
        result.noAssignee = Boolean(value);
        break;
      default:
        result[key] = value;
    }
  });
  return result;
};

export function useFilters(initialFilters = {}) {
  const debouncedTimerRef = useRef(null);
  const isUpdatingRef = useRef(false);
  const [filters, setFilters] = useState({
    ...INITIAL_FILTERS,
    ...initialFilters,
  });

  const updateFilters = useCallback((newFilters) => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    if (debouncedTimerRef.current) {
      clearTimeout(debouncedTimerRef.current);
    }
    debouncedTimerRef.current = setTimeout(() => {
      setFilters((prevFilters) => {
        const updatedFilters = validateAndNormalizeFilters(
          newFilters,
          prevFilters
        );
        isUpdatingRef.current = false;
        return updatedFilters;
      });
    }, 200);
  }, []);

  const resetFilters = useCallback(() => {
    if (debouncedTimerRef.current) {
      clearTimeout(debouncedTimerRef.current);
    }
    isUpdatingRef.current = false;
    setFilters(INITIAL_FILTERS);
  }, []);

  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (filters.languages?.length > 0) count++;
    if (filters.excludedLanguages?.length > 0) count++;
    if (filters.repositories?.length > 0) count++;
    if (filters.excludedRepositories?.length > 0) count++;
    if (filters.labels?.length > 0) count++;
    if (filters.excludedLabels?.length > 0) count++;
    if (
      filters.minStars !== STAR_FILTERS.DEFAULT_MIN_STARS ||
      filters.maxStars !== STAR_FILTERS.DEFAULT_MAX_STARS
    )
      count++;
    if (filters.noAssignee) count++;
    if (filters.bookmarkedOnly) count++;
    return count;
  }, [filters]);

  return {
    filters,
    updateFilters,
    resetFilters,
    getActiveFilterCount,
  };
}

export function useIssues(initialFilters = {}) {
  const { filters, updateFilters, resetFilters, getActiveFilterCount } =
    useFilters(initialFilters);
  const { bookmarkIds } = useAppContext();

  const [state, setState] = useState({
    issues: [],
    pendingIssues: [],
    loading: true,
    error: null,
    isFiltering: false,
    pagination: {
      limit: 10,
      total: 0,
      hasMore: false,
      nextCursor: null,
    },
  });

  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);
  const isFirstLoad = useRef(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const shouldResetPagination = useRef(false);
  const prevFiltersRef = useRef(filters);
  const prevBookmarkedOnlyRef = useRef(filters.bookmarkedOnly);
  const bookmarkIdsRef = useRef(bookmarkIds);

  useEffect(() => {
    const previousIds = bookmarkIdsRef.current;
    bookmarkIdsRef.current = bookmarkIds;

    if (filters.bookmarkedOnly && !isFirstLoad.current) {
      if (bookmarkIds.length < previousIds.length && bookmarkIds.length > 0) {
        const removedId = previousIds.find((id) => !bookmarkIds.includes(id));

        setState((prevState) => {
          const updatedIssues = prevState.issues.filter(
            (issue) => issue.github_id !== removedId
          );

          return {
            ...prevState,
            issues: updatedIssues,
            isFiltering: false,
            pagination: {
              ...prevState.pagination,
              total: Math.max(0, prevState.pagination.total - 1),
              hasMore:
                updatedIssues.length === 0
                  ? false
                  : prevState.pagination.hasMore,
            },
          };
        });
      } else if (bookmarkIds.length === 0 && previousIds.length > 0) {
        setState((prevState) => ({
          ...prevState,
          issues: [],
          loading: true,
          isFiltering: true,
          error: null,
          pagination: {
            ...prevState.pagination,
            total: 0,
            hasMore: false,
            nextCursor: null,
          },
        }));
        requestIdRef.current++;
        setTimeout(() => fetchIssues(), 0);
      } else if (bookmarkIds.length > previousIds.length) {
        requestIdRef.current++;
        setState((prev) => ({
          ...prev,
          loading: true,
          isFiltering: true,
        }));
        fetchIssues();
      }
    }
  }, [bookmarkIds, filters.bookmarkedOnly]);

  const fetchIssues = useCallback(
    async (cursor = null) => {
      if (filters.bookmarkedOnly && bookmarkIdsRef.current.length === 0) {
        setState((prev) => ({
          ...prev,
          issues: [],
          loading: false,
          isFiltering: false,
          error: null,
          pagination: {
            ...prev.pagination,
            total: 0,
            hasMore: false,
            nextCursor: null,
          },
        }));
        isFirstLoad.current = false;
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const thisRequestId = ++requestIdRef.current;
      abortControllerRef.current = new AbortController();
      const isInitialFetch = cursor === null;
      const isFilterOperation = !isFirstLoad.current && isInitialFetch;

      setState((prev) => ({
        ...prev,
        loading: true,
        isFiltering: isFilterOperation,
        ...(isInitialFetch ? { error: null } : {}),
      }));

      try {
        const queryParams = buildQueryParams({
          ...filters,
          ...(filters.bookmarkedOnly && {
            bookmarkIds: bookmarkIdsRef.current,
          }),
          limit: state.pagination.limit,
          ...(cursor && { cursor: cursor.cursor, cursorId: cursor.cursorId }),
        });

        const response = await fetch(`/api/issues?${queryParams}`, {
          signal: abortControllerRef.current.signal,
        });

        if (thisRequestId !== requestIdRef.current) return;

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Server error: ${response.status}`
          );
        }

        const { issues: newIssues, pagination: paginationData } =
          await response.json();

        if (thisRequestId !== requestIdRef.current) return;

        setState((prevState) => {
          const nextIssues = isInitialFetch
            ? newIssues
            : [...prevState.issues, ...newIssues];
          return {
            ...prevState,
            issues: nextIssues,
            loading: false,
            isFiltering: false,
            error: null,
            pagination: {
              ...prevState.pagination,
              total: paginationData.total || 0,
              hasMore: paginationData.hasMore,
              nextCursor: paginationData.nextCursor,
            },
          };
        });

        isFirstLoad.current = false;
      } catch (err) {
        if (thisRequestId !== requestIdRef.current) return;

        const errorMessage = handleApiError(
          filters.bookmarkedOnly ? "Bookmarked Issues" : "Issues",
          err,
          {
            filters,
            pagination: { limit: state.pagination.limit, cursor },
          }
        );

        if (errorMessage) {
          setState((prevState) => ({
            ...prevState,
            error: errorMessage,
            loading: false,
            isFiltering: false,
          }));
        }

        isFirstLoad.current = false;
      }
    },
    [filters, state.pagination.limit]
  );

  const loadMore = useCallback(() => {
    if (
      !state.loading &&
      state.pagination.hasMore &&
      state.pagination.nextCursor
    ) {
      fetchIssues(state.pagination.nextCursor);
    }
  }, [
    state.loading,
    state.pagination.hasMore,
    state.pagination.nextCursor,
    fetchIssues,
  ]);

  const refreshIssues = useCallback(async () => {
    setIsRetrying(true);
    try {
      fetchIssues();
    } finally {
      setIsRetrying(false);
    }
  }, [fetchIssues]);

  const handleFilterReset = useCallback(() => {
    requestIdRef.current++;
    resetFilters();

    setState((prev) => ({
      ...prev,
      loading: true,
      isFiltering: true,
      error: null,
      pagination: {
        ...prev.pagination,
        total: 0,
        hasMore: false,
        nextCursor: null,
      },
    }));
  }, [resetFilters]);

  const handleFilterUpdate = useCallback(
    (newFilters) => {
      requestIdRef.current++;
      updateFilters(newFilters);

      setState((prev) => ({
        ...prev,
        issues: [],
        loading: true,
        isFiltering: true,
        error: null,
        pagination: {
          ...prev.pagination,
          total: 0,
          hasMore: false,
          nextCursor: null,
        },
      }));
    },
    [updateFilters]
  );

  useEffect(() => {
    const filterChanged =
      JSON.stringify(prevFiltersRef.current) !== JSON.stringify(filters);
    const bookmarkedOnlyChanged =
      prevBookmarkedOnlyRef.current !== filters.bookmarkedOnly;
    prevFiltersRef.current = filters;
    prevBookmarkedOnlyRef.current = filters.bookmarkedOnly;

    if (isFirstLoad.current) return;

    if (filterChanged) {
      shouldResetPagination.current = true;
      requestIdRef.current++;

      setState((prev) => ({
        ...prev,
        issues: [],
        loading: true,
        isFiltering: true,
        error: null,
        pagination: {
          ...prev.pagination,
          total: 0,
          hasMore: false,
          nextCursor: null,
        },
      }));

      const currentRequestId = requestIdRef.current;
      setTimeout(() => {
        if (currentRequestId === requestIdRef.current) {
          fetchIssues();
        }
      }, 10);
    }
  }, [filters, fetchIssues]);

  useEffect(() => {
    const currentRequestId = requestIdRef.current;
    const timer = setTimeout(
      () => {
        if (currentRequestId === requestIdRef.current) {
          fetchIssues();
        }
      },
      isFirstLoad.current ? 0 : 0
    );

    return () => {
      clearTimeout(timer);
      abortControllerRef.current?.abort();
    };
  }, [fetchIssues]);

  useEffect(() => {
    return () => {
      requestIdRef.current++;
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    issues: state.issues,
    loading: state.loading,
    isFiltering: state.isFiltering,
    error: state.error,
    pagination: state.pagination,
    filters,
    updateFilters: handleFilterUpdate,
    resetFilters: handleFilterReset,
    loadMore,
    refreshIssues,
    isRetrying,
    getActiveFilterCount,
  };
}
