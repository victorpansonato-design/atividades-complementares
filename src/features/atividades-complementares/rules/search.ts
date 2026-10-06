/**
 * Busca sem acentos por termos comuns, nome e código ("estagio" encontra "Estágio";
 * "25_003a", "25003" e "003" encontram a publicação).
 */
import { normalizeText } from "@/lib/utils";

export function normalizeQuery(query: string): string {
   return normalizeText(query).replace(/\s+/g, " ");
}

function compactCode(value: string): string {
   return normalizeText(value).replace(/[^a-z0-9]/g, "");
}

/** Todos os termos precisam aparecer em algum dos textos pesquisáveis. */
export function matchesQuery(query: string, haystack: (string | null | undefined)[], codes: (string | null | undefined)[] = []): boolean {
   const q = normalizeQuery(query);
   if (!q) return true;
   const text = haystack
      .filter(Boolean)
      .map(t => normalizeText(t!))
      .join(" \n ");
   const compactCodes = codes.filter(Boolean).map(c => compactCode(c!));
   return q.split(" ").every(term => {
      if (text.includes(term)) return true;
      const compactTerm = compactCode(term);
      return compactTerm.length >= 2 && compactCodes.some(code => code.includes(compactTerm));
   });
}
