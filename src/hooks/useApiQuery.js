import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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

function compareFilterValue(value1, value2) {
  if (Array.isArray(value1) && Array.isArray(value2)) {
    if (value1.length !== value2.length) {
      return false;
    }
    const sorted1 = [...value1].sort();
    const sorted2 = [...value2].sort();
    return JSON.stringify(sorted1) === JSON.stringify(sorted2);
  }
  return value1 === value2;
}

function areFiltersEqual(filters1, filters2) {
  if (!filters1 || !filters2) {
    return filters1 === filters2;
  }

  const keys = Object.keys(INITIAL_FILTERS);

  for (const key of keys) {
    if (!compareFilterValue(filters1[key], filters2[key])) {
      return false;
    }
  }

  return true;
}

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
      case "bookmarkIds":
        result[key] = Array.isArray(value)
          ? value.filter((v) => v != null)
          : [];
        break;
      case "sortBy":
        result.sortBy =
          typeof value === "string" ? value : INITIAL_FILTERS.sortBy;
        break;
      case "sortOrder":
        result.sortOrder =
          typeof value === "string" &&
          ["asc", "desc"].includes(value.toLowerCase())
            ? value.toLowerCase()
            : INITIAL_FILTERS.sortOrder;
        break;
      case "minStars": {
        const minStars = parseInt(value, 10);
        result.minStars = isNaN(minStars)
          ? STAR_FILTERS.DEFAULT_MIN_STARS
          : Math.max(STAR_FILTERS.DEFAULT_MIN_STARS, minStars);
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
          result.maxStars =
            isNaN(maxStars) || maxStars < 0
              ? STAR_FILTERS.DEFAULT_MAX_STARS
              : Math.max(0, maxStars);
          if (
            result.minStars > result.maxStars &&
            result.maxStars !== STAR_FILTERS.DEFAULT_MAX_STARS
          ) {
            result.maxStars = Math.max(result.minStars, result.maxStars);
          } else if (result.minStars > result.maxStars) {
            result.minStars = result.maxStars;
          }
        }
        break;
      }
      case "noAssignee":
      case "bookmarkedOnly":
        result[key] = value === true || value === "true";
        break;
      case "limit":
      case "cursor":
      case "cursorId":
        break;
      default:
        break;
    }
  });
  if (
    result.maxStars !== STAR_FILTERS.DEFAULT_MAX_STARS &&
    result.minStars > result.maxStars
  ) {
    result.maxStars = result.minStars;
  }
  if (result.minStars < STAR_FILTERS.DEFAULT_MIN_STARS) {
    result.minStars = STAR_FILTERS.DEFAULT_MIN_STARS;
  }

  return result;
};

const parseFiltersFromParams = (searchParams) => {
  if (!searchParams) return INITIAL_FILTERS;

  const getArrayParam = (key) =>
    searchParams.getAll(`${key}[]`).filter((v) => v);
  const getStringParam = (key, defaultValue) =>
    searchParams.get(key) || defaultValue;
  const getBoolParam = (key, defaultValue) =>
    searchParams.get(key) === "true"
      ? true
      : searchParams.get(key) === "false"
      ? false
      : defaultValue;
  const getIntParam = (key, defaultValue) => {
    const val = searchParams.get(key);
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  const rawFilters = {
    languages: getArrayParam("languages"),
    excludedLanguages: getArrayParam("excludedLanguages"),
    labels: getArrayParam("labels"),
    excludedLabels: getArrayParam("excludedLabels"),
    repositories: getArrayParam("repositories"),
    excludedRepositories: getArrayParam("excludedRepositories"),
    sortBy: getStringParam("sortBy", undefined),
    sortOrder: getStringParam("sortOrder", undefined),
    noAssignee: searchParams.has("noAssignee")
      ? getBoolParam("noAssignee", false)
      : undefined,
    minStars: searchParams.has("minStars")
      ? getIntParam("minStars", undefined)
      : undefined,
    maxStars: searchParams.has("maxStars")
      ? getIntParam("maxStars", undefined)
      : undefined,
    bookmarkedOnly: searchParams.has("bookmarkedOnly")
      ? getBoolParam("bookmarkedOnly", false)
      : undefined,
  };

  const definedFilters = Object.fromEntries(
    Object.entries(rawFilters).filter(([_, v]) => v !== undefined)
  );

  return validateAndNormalizeFilters(definedFilters, INITIAL_FILTERS);
};

export function useFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const debouncedTimerRef = useRef(null);
  const isUpdatingRef = useRef(false);
  const firstRender = useRef(true);

  const [filters, setFilters] = useState(() => {
    return parseFiltersFromParams(searchParams);
  });

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    if (isUpdatingRef.current) return;

    const paramsToSync = {};
    for (const key in filters) {
      if (
        Object.hasOwnProperty.call(filters, key) &&
        Object.hasOwnProperty.call(INITIAL_FILTERS, key)
      ) {
        if (!compareFilterValue(filters[key], INITIAL_FILTERS[key])) {
          paramsToSync[key] = filters[key];
        }
      }
    }

    const newQueryString = buildQueryParams(paramsToSync).toString();
    const currentQueryString = searchParams.toString();

    if (newQueryString !== currentQueryString) {
      router.replace(
        `${pathname}${newQueryString ? "?" + newQueryString : ""}`,
        { scroll: false }
      );
    }
  }, [filters, router, pathname, searchParams]);

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
        if (areFiltersEqual(prevFilters, updatedFilters)) {
          return prevFilters;
        }
        return updatedFilters;
      });
    }, 300);
  }, []);

  const resetFilters = useCallback(() => {
    if (debouncedTimerRef.current) {
      clearTimeout(debouncedTimerRef.current);
    }
    isUpdatingRef.current = false;
    setFilters((prevFilters) => {
      if (areFiltersEqual(prevFilters, INITIAL_FILTERS)) {
        return prevFilters;
      }
      return INITIAL_FILTERS;
    });
  }, []);

  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    const keys = Object.keys(INITIAL_FILTERS);
    for (const key of keys) {
      if (!compareFilterValue(filters[key], INITIAL_FILTERS[key])) {
        if (Array.isArray(filters[key]) && filters[key].length === 0) {
          continue;
        }
        count++;
      }
    }
    return count;
  }, [filters]);

  useEffect(() => {
    const filtersFromCurrentUrl = parseFiltersFromParams(searchParams);
    setFilters((prevFilters) => {
      if (!areFiltersEqual(prevFilters, filtersFromCurrentUrl)) {
        return filtersFromCurrentUrl;
      }
      return prevFilters;
    });
  }, [searchParams]);

  return {
    filters,
    updateFilters,
    resetFilters,
    getActiveFilterCount,
  };
}

export function useIssues() {
  const { filters, updateFilters, resetFilters, getActiveFilterCount } =
    useFilters();
  const { bookmarkIds } = useAppContext();
  const [state, setState] = useState({
    issues: [],
    loading: true,
    error: null,
    isFiltering: false,
    pagination: { limit: 10, total: 0, hasMore: false, nextCursor: null },
  });
  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);
  const isFirstLoad = useRef(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const bookmarkIdsRef = useRef(bookmarkIds);

  const fetchIssues = useCallback(
    async (cursor = null) => {
      if (filters.bookmarkedOnly && bookmarkIdsRef.current.length === 0) {
        setState((prev) => ({
          ...prev,
          loading: true,
          isFiltering: true,
        }));

        setTimeout(() => {
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
        }, 500);

        return;
      }

      if (abortControllerRef.current) abortControllerRef.current.abort();
      const thisRequestId = ++requestIdRef.current;
      abortControllerRef.current = new AbortController();
      const isInitialFetch = cursor === null;
      const isFilterOperation = isInitialFetch && !isFirstLoad.current;

      setState((prev) => ({
        ...prev,
        loading: true,
        isFiltering: isFilterOperation,
        ...(isInitialFetch && !isFilterOperation
          ? { issues: [], error: null }
          : {}),
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
        if (isInitialFetch) isFirstLoad.current = false;
      } catch (err) {
        if (err.name === "AbortError") {
          if (thisRequestId === requestIdRef.current)
            setState((prev) => ({
              ...prev,
              loading: false,
              isFiltering: false,
            }));
          return;
        }
        if (thisRequestId !== requestIdRef.current) return;

        const errorMessage = handleApiError(
          filters.bookmarkedOnly ? "Bookmarked Issues" : "Issues",
          err,
          { filters, pagination: { limit: state.pagination.limit, cursor } }
        );
        if (errorMessage)
          setState((prevState) => ({
            ...prevState,
            issues: isInitialFetch ? [] : prevState.issues,
            error: errorMessage,
            loading: false,
            isFiltering: false,
          }));
        else
          setState((prev) => ({ ...prev, loading: false, isFiltering: false }));
        if (isInitialFetch) isFirstLoad.current = false;
      }
    },
    [filters, state.pagination.limit]
  );

  useEffect(() => {
    fetchIssues();
    return () => {
      requestIdRef.current++;
      abortControllerRef.current?.abort();
    };
  }, [fetchIssues]);

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
    isFirstLoad.current = true;
    try {
      await fetchIssues();
    } finally {
      setIsRetrying(false);
    }
  }, [fetchIssues]);

  useEffect(() => {
    const previousIds = bookmarkIdsRef.current;
    bookmarkIdsRef.current = bookmarkIds;
    if (filters.bookmarkedOnly && !isFirstLoad.current) {
      if (
        JSON.stringify(previousIds.sort()) !==
        JSON.stringify(bookmarkIds.sort())
      ) {
        fetchIssues();
      }
    }
  }, [bookmarkIds, filters.bookmarkedOnly, fetchIssues]);

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
    updateFilters,
    resetFilters,
    loadMore,
    refreshIssues,
    isRetrying,
    getActiveFilterCount,
  };
}
