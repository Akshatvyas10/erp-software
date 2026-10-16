import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState<boolean>(() => {
        if (typeof window !== "undefined") {
            return window.matchMedia(query).matches;
        }
        return false;
    });

    useEffect(() => {
        if (typeof window === "undefined") return;

        const mediaQuery = window.matchMedia(query);
        setMatches(mediaQuery.matches);

        const listener = (event: MediaQueryListEvent) => {
            setMatches(event.matches);
        };

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener("change", listener);
        } else {
            // Deprecated fallback for older browsers
            (mediaQuery as any).addListener(listener);
        }

        return () => {
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener("change", listener);
            } else {
                (mediaQuery as any).removeListener(listener);
            }
        };
    }, [query]);

    return matches;
}
