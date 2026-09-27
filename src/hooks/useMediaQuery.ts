import { useCallback, useSyncExternalStore } from "react";

/** CSS 미디어 쿼리 일치 여부를 구독한다 (Fold 접기/펼치기·회전 시 자동 갱신). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}
