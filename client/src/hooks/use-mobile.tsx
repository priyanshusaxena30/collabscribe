import { useState, useEffect } from "react";

/**
 * Hook to detect if the current viewport matches a media query
 * @param query Media query string (e.g., "(max-width: 768px)")
 * @returns Boolean indicating if the media query matches
 */
export default function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // Initial check
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    // Create event listener
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add event listener
    mediaQuery.addEventListener("change", handler);

    // Clean up
    return () => {
      mediaQuery.removeEventListener("change", handler);
    };
  }, [query]);

  return matches;
}
