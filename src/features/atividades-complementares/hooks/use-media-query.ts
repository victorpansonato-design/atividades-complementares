import { useSyncExternalStore } from "react";

/** Assina uma media query (ex.: layout de duas colunas a partir de 1024px). */
export function useMediaQuery(query: string): boolean {
   return useSyncExternalStore(
      onChange => {
         if (typeof window === "undefined" || !window.matchMedia) return () => {};
         const mql = window.matchMedia(query);
         mql.addEventListener("change", onChange);
         return () => mql.removeEventListener("change", onChange);
      },
      () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false),
      () => false,
   );
}
