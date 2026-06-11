import { useEffect } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';

/**
 * Applies the William appearance preference (light / dark / auto) to <html>.
 * - `light` / `dark` set `data-theme` explicitly.
 * - `auto` follows the device via `prefers-color-scheme` and live-updates.
 * The CSS keys dark tokens off `html[data-theme="dark"]` (see william.css).
 * Mount once near the app root.
 */
export function useWilliamTheme() {
  const theme = useSettingsStore((s) => s.theme ?? 'auto');

  useEffect(() => {
    const root = document.documentElement;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const resolved = theme === 'auto' ? (mql.matches ? 'dark' : 'light') : theme;
      root.setAttribute('data-theme', resolved);
    };

    apply();
    if (theme === 'auto') {
      mql.addEventListener('change', apply);
      return () => mql.removeEventListener('change', apply);
    }
  }, [theme]);
}
