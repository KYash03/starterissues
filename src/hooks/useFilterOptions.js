import { useState, useEffect, useRef } from "react";

export function useFilterOptions() {
  const [filterOptions, setFilterOptions] = useState({
    languages: [],
    repositories: [],
    labels: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const fetchRequestRef = useRef(0);

  useEffect(() => {
    const currentRequestId = ++fetchRequestRef.current;
    const abortController = new AbortController();

    const fetchFilterOptions = async () => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/filter-options", {
          signal: abortController.signal,
        });

        if (currentRequestId !== fetchRequestRef.current) return;

        if (response.ok) {
          const data = await response.json();
          if (currentRequestId !== fetchRequestRef.current) return;

          setFilterOptions({
            languages: data.languages || [],
            labels: data.labels || [],
            repositories: data.repositories || [],
          });
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Failed to fetch filter options:", error);
        }
      } finally {
        if (currentRequestId === fetchRequestRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchFilterOptions();

    return () => {
      abortController.abort();
    };
  }, []);

  return {
    filterOptions,
    isLoading,
  };
}

export const sortOptions = [
  { value: "updated_at", label: "Updated" },
  { value: "created_at", label: "Created" },
  { value: "comments", label: "Comments" },
  { value: "stargazers_count", label: "Stars" },
];
