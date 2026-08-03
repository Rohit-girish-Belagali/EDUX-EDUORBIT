/**
 * ThemeScript - Initializes theme from localStorage before React hydration
 * This prevents the flash of wrong theme on page load.
 *
 * Must be a Server Component: in Next.js / React 19, <script> tags rendered
 * by Client Components are inert on the client. Rendering it from the server
 * inlines the snippet into the SSR HTML so the browser executes it before
 * hydration.
 */
export default function ThemeScript() {
  const themeScript = `
    (function() {
      try {
        const stored = localStorage.getItem('edux-theme');

        document.documentElement.classList.remove('dark', 'theme-glass', 'theme-snow', 'theme-neon');

        if (stored === 'dark') {
          document.documentElement.classList.add('dark');
        } else if (stored === 'glass') {
          document.documentElement.classList.add('dark', 'theme-glass');
        } else if (stored === 'snow') {
          document.documentElement.classList.add('theme-snow');
        } else if (stored === 'neon') {
          document.documentElement.classList.add('dark', 'theme-neon');
        } else if (stored === 'light') {
          // already clean
        } else {
          // No stored preference: Neon (futuristic dark) is the default
          // for every system. Must stay in sync with lib/theme.ts.
          document.documentElement.classList.add('dark', 'theme-neon');
          localStorage.setItem('edux-theme', 'neon');
        }
      } catch (e) {
        /* localStorage may be disabled */
      }
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: themeScript }}
      suppressHydrationWarning
    />
  );
}
