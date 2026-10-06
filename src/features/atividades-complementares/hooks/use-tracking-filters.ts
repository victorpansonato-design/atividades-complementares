/**
 * URL STATE do acompanhamento: situação, busca e ordenação ficam na rota
 * (compartilhável, sobrevive ao recarregar). Nada disso vai para o Zustand.
 */
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";

export const STATUS_FILTERS = [
   { id: "todos", label: "Todos" },
   { id: "em-analise", label: "Em análise" },
   { id: "correcao", label: "Precisa de correção" },
   { id: "aprovadas", label: "Aprovadas" },
   { id: "nao-aprovadas", label: "Não aprovadas" },
] as const;

export type StatusFilter = (typeof STATUS_FILTERS)[number]["id"];
export type SortOrder = "acao" | "recentes";

const SEARCH_DEBOUNCE_MS = 250;

function isStatusFilter(value: string | null): value is StatusFilter {
   return STATUS_FILTERS.some(f => f.id === value);
}

export function useTrackingFilters() {
   const [searchParams, setSearchParams] = useSearchParams();

   const filters = useMemo(() => {
      const status = searchParams.get("situacao");
      return {
         status: isStatusFilter(status) ? status : ("todos" as StatusFilter),
         search: searchParams.get("busca") ?? "",
         order: (searchParams.get("ordem") === "recentes" ? "recentes" : "acao") as SortOrder,
      };
   }, [searchParams]);

   const update = useCallback(
      (key: string, value: string | null, defaultValue: string) => {
         setSearchParams(
            prev => {
               const next = new URLSearchParams(prev);
               if (!value || value === defaultValue) next.delete(key);
               else next.set(key, value);
               return next;
            },
            { replace: true },
         );
      },
      [setSearchParams],
   );

   const setSearch = useDebouncedCallback((search: string) => update("busca", search.trim(), ""), SEARCH_DEBOUNCE_MS);
   const setStatus = useCallback((status: StatusFilter) => update("situacao", status, "todos"), [update]);
   const setOrder = useCallback((order: SortOrder) => update("ordem", order, "acao"), [update]);
   const clear = useCallback(() => setSearchParams(new URLSearchParams(), { replace: true }), [setSearchParams]);

   return { filters, setSearch, setStatus, setOrder, clear };
}
