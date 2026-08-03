/**
 * Theme persistence utilities
 * Handles light/dark theme with localStorage fallback and system preference detection
 */

export type Theme = "light" | "dark" | "glass" | "snow" | "neon";

export const THEME_STORAGE_KEY = "edux-theme";

type ThemeChangeListener = (theme: Theme) => void;
const themeListeners = new Set<ThemeChangeListener>();

/**
 * Subscribe to theme changes
 */
export function subscribeToThemeChanges(
  listener: ThemeChangeListener,
): () => void {
  themeListeners.add(listener);
  return () => themeListeners.delete(listener);
}

/**
 * Notify all listeners of theme change
 */
function notifyThemeChange(theme: Theme): void {
  themeListeners.forEach((listener) => listener(theme));
}

/**
 * Get the stored theme from localStorage
 */
export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (
      stored === "light" ||
      stored === "dark" ||
      stored === "glass" ||
      stored === "snow" ||
      stored === "neon"
    ) {
      return stored;
    }
  } catch (e) {
    // Silently fail - localStorage may be disabled
  }

  return null;
}

/**
 * Save theme to localStorage
 */
export function saveThemeToStorage(theme: Theme): boolean {
  if (typeof window === "undefined") return false;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    return true;
  } catch (e) {
    // Silently fail - localStorage may be disabled or full
    return false;
  }
}

/**
 * Get the default theme when no preference is stored.
 * Neon (the futuristic dark theme) is the default for every system.
 * Must stay in sync with the inline ThemeScript fallback.
 */
export function getSystemTheme(): Theme {
  return "neon";
}

/**
 * Apply theme to document
 */
export function applyThemeToDocument(theme: Theme): void {
  if (typeof document === "undefined") return;

  const html = document.documentElement;

  html.classList.remove("dark", "theme-glass", "theme-snow", "theme-neon");

  if (theme === "dark") {
    html.classList.add("dark");
  } else if (theme === "glass") {
    html.classList.add("dark", "theme-glass");
  } else if (theme === "snow") {
    html.classList.add("theme-snow");
  } else if (theme === "neon") {
    html.classList.add("dark", "theme-neon");
  }
}

/**
 * Initialize theme on app startup
 * Priority: localStorage > system preference (snow on light systems, dark on dark)
 */
export function initializeTheme(): Theme {
  // Check localStorage first
  const stored = getStoredTheme();
  if (stored) {
    applyThemeToDocument(stored);
    return stored;
  }

  // Fall back to system preference
  const systemTheme = getSystemTheme();
  applyThemeToDocument(systemTheme);
  saveThemeToStorage(systemTheme);
  return systemTheme;
}

/**
 * Set theme and persist it
 */
export function setTheme(theme: Theme): void {
  applyThemeToDocument(theme);
  saveThemeToStorage(theme);
  notifyThemeChange(theme);
}
