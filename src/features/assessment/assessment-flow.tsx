import { useEffect, useRef } from "react";

export function useDraftAutosave<T>(draft: T | null, save: (draft: T) => Promise<unknown>, delayMs = 350) {
  const initial = useRef(true);
  useEffect(() => {
    if (!draft) return;
    if (initial.current) {
      initial.current = false;
      return;
    }
    const timer = window.setTimeout(() => { void save(draft); }, delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, draft, save]);
}
