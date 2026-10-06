import { useMemo } from "react";
import { useCatalog } from "../api/queries";
import type { ActivityType, Catalog } from "../types/catalog.schema";

export type ActivityLookup = (catalogVersion: string, localId: string) => ActivityType | undefined;

export function buildActivityLookup(catalog: Catalog | undefined): ActivityLookup {
   const map = new Map<string, ActivityType>();
   for (const a of [...(catalog?.activities ?? []), ...(catalog?.historicalTypes ?? [])]) {
      map.set(`${a.catalogVersion}::${a.localId}`, a);
   }
   // Versão + id local: nunca casar por semelhança de título.
   return (catalogVersion, localId) => map.get(`${catalogVersion}::${localId}`);
}

export function useActivityLookup(): ActivityLookup {
   const { data: catalog } = useCatalog();
   return useMemo(() => buildActivityLookup(catalog), [catalog]);
}
