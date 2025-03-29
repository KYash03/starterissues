import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { createColorSchemeListener } from "@/lib/utils/theme-utils";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [theme, setTheme] = useState(null);
  const [bookmarkIds, setBookmarkIds] = useState([]);
  const [csrfToken, setCsrfToken] = useState("");

  useEffect(() => {
    const currentTheme =
      document.documentElement.getAttribute("data-theme") || "dark";
    setTheme(currentTheme);
    try {
      const savedBookmarkIds = localStorage.getItem("bookmarkIds");
      if (savedBookmarkIds) {
        setBookmarkIds(JSON.parse(savedBookmarkIds));
      }
    } catch (error) {
      console.error("Error loading bookmark IDs:", error);
    }
    return createColorSchemeListener(setTheme);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = Array.from(
        window.crypto.getRandomValues(new Uint8Array(16))
      )
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      setCsrfToken(token);
      document.cookie = `XSRF-TOKEN=${token}; path=/; samesite=strict; max-age=3600`;
    }
  }, []);

  const toggleTheme = () => {
    try {
      const newTheme = theme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
      setTheme(newTheme);
    } catch (error) {
      console.error("Error toggling theme:", error);
      setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    }
  };

  useEffect(() => {
    const fetchLastUpdated = async () => {
      try {
        setIsDataLoading(true);
        const response = await fetch("/api/metadata");
        if (response.ok) {
          const data = await response.json();
          setLastUpdated(data.metadata.last_refresh);
        }
      } catch (error) {
        console.error("Failed to fetch last updated time:", error);
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchLastUpdated();
  }, []);

  const toggleBookmark = (issue) => {
    setBookmarkIds((prevIds) => {
      const isBookmarked = prevIds.includes(issue.github_id);
      let newIds;
      if (isBookmarked) {
        newIds = prevIds.filter((id) => id !== issue.github_id);
      } else {
        newIds = [...prevIds, issue.github_id];
      }
      try {
        localStorage.setItem("bookmarkIds", JSON.stringify(newIds));
      } catch (error) {
        console.error("Error saving bookmark IDs:", error);
      }
      return newIds;
    });
  };

  const isBookmarked = (issueId) => {
    return bookmarkIds.includes(issueId);
  };

  const clearAllBookmarks = () => {
    setBookmarkIds([]);
    try {
      localStorage.setItem("bookmarkIds", JSON.stringify([]));
    } catch (error) {
      console.error("Error clearing bookmark IDs:", error);
    }
  };

  const themeValue = useMemo(
    () => ({
      theme,
      toggleTheme,
    }),
    [theme]
  );

  const bookmarkValue = useMemo(
    () => ({
      bookmarkIds,
      toggleBookmark,
      isBookmarked,
      clearAllBookmarks,
    }),
    [bookmarkIds]
  );

  const loadingValue = useMemo(
    () => ({
      lastUpdated,
      isDataLoading,
    }),
    [lastUpdated, isDataLoading]
  );

  const securityValue = useMemo(
    () => ({
      csrfToken,
    }),
    [csrfToken]
  );

  const contextValue = useMemo(
    () => ({
      ...themeValue,
      ...bookmarkValue,
      ...loadingValue,
      ...securityValue,
    }),
    [themeValue, bookmarkValue, loadingValue, securityValue]
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
