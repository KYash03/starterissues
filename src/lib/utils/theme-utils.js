const THEME_STORAGE_KEY = "theme";
const DEFAULT_THEME = "dark";

export function getInitialThemeScript() {
  return `
    (function() {
      try {
        var theme = localStorage.getItem("${THEME_STORAGE_KEY}") || 
                   (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "${DEFAULT_THEME}");
        document.documentElement.setAttribute("data-theme", theme);
      } catch (e) {
        document.documentElement.setAttribute("data-theme", "${DEFAULT_THEME}");
      }
    })();
  `;
}

function getBrowserTheme() {
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : DEFAULT_THEME;
}

export function getInitialTheme() {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    return (
      document.documentElement.getAttribute("data-theme") ||
      localStorage.getItem(THEME_STORAGE_KEY) ||
      getBrowserTheme()
    );
  } catch (e) {
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme) {
  if (typeof document === "undefined") return;
  try {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export function toggleTheme(currentTheme) {
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(newTheme);
  return newTheme;
}

export function createColorSchemeListener(callback) {
  if (typeof window === "undefined") return () => {};

  const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
  const handleChange = (e) => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (!storedTheme) {
      const newTheme = e.matches ? "light" : "dark";
      applyTheme(newTheme);
      callback(newTheme);
    }
  };

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }
  return () => {};
}
