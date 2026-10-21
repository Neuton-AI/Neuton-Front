import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Keep the canvas and any platform-retained system UI in sync with the page. */
export function useAppChrome() {
  const { pathname } = useLocation();
  const capture = /^\/capture\/?$/.test(pathname);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousTheme = theme?.content;
    const previousBackground = root.style.getPropertyValue('--app-background');
    const previousScheme = root.style.colorScheme;
    const color = capture ? '#181715' : '#FAF9F5';

    const apply = () => {
      if (theme) theme.content = color;
      root.style.setProperty('--app-background', color);
      root.style.colorScheme = capture ? 'dark' : 'light';
    };
    apply();
    // Reapply the page hints when returning from the OS/browser's background state.
    window.addEventListener('pageshow', apply);
    document.addEventListener('visibilitychange', apply);
    return () => {
      window.removeEventListener('pageshow', apply);
      document.removeEventListener('visibilitychange', apply);
      if (theme && previousTheme !== undefined) theme.content = previousTheme;
      if (previousBackground) root.style.setProperty('--app-background', previousBackground);
      else root.style.removeProperty('--app-background');
      root.style.colorScheme = previousScheme;
    };
  }, [capture]);
}
