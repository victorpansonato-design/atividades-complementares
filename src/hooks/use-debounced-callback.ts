import { useCallback, useEffect, useRef } from "react";

/**
 * Retorna uma versão debounced do callback: só executa após `delay` ms sem
 * novas chamadas. O timer pendente é cancelado no unmount.
 */
export function useDebouncedCallback<Args extends unknown[]>(callback: (...args: Args) => void, delay: number) {
   const callbackRef = useRef(callback);
   const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

   useEffect(() => {
      callbackRef.current = callback;
   }, [callback]);

   useEffect(() => {
      return () => clearTimeout(timeoutRef.current);
   }, []);

   return useCallback(
      (...args: Args) => {
         clearTimeout(timeoutRef.current);
         timeoutRef.current = setTimeout(() => callbackRef.current(...args), delay);
      },
      [delay],
   );
}
