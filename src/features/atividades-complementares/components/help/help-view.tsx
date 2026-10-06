import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown, FileText } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { useCatalog } from "../../api/queries";
import { HELP_ITEMS } from "../../content/help";
import { displayCode, presentActivity } from "../../content/catalog-presentation";
import { activityRuleLines } from "../../content/texts";
import { requirementLabel } from "../../rules/requirements";
import { matchesQuery } from "../../rules/search";
import type { ActivityType } from "../../types/catalog.schema";
import { RegulationDownload, RegulationLink } from "../common/regulation-links";
import { RESPONSIVE_HEADER } from "../tracking/tracking-view";
import { HowItWorks, WhatCounts } from "../basics/basics";
import { WHAT_ARE } from "../../content/basics";
import { HelpList } from "./help-items";

function documentsOf(activity: ActivityType): string[] {
   return activity.documentRequirements.flatMap(r => {
      if ("source" in r) return [`${r.description} (não é preciso anexar)`];
      if ("conditional" in r) {
         const modes = activity.unitRule?.modes ?? [];
         return Object.entries(r.modes).map(([modeId, reqs]) => {
            const label = modes.find(m => m.id === modeId)?.label ?? modeId;
            return `${label}: ${reqs.map(x => requirementLabel({ kind: "upload", ...x })).join(" + ")}`;
         });
      }
      return [requirementLabel({ kind: "upload", ...r })];
   });
}

export function HelpView() {
   const catalogQ = useCatalog();
   const [query, setQuery] = useState("");
   const activities = useMemo(
      () =>
         (catalogQ.data?.activities ?? []).filter(a => {
            const p = presentActivity(a);
            return matchesQuery(query, [p.shortName, a.displayName, p.keywords], [a.localId, a.regulationCode, displayCode(a)]);
         }),
      [catalogQ.data, query],
   );

   // Links como /ajuda#o-que-conta levam direto à seção.
   const { hash } = useLocation();
   useEffect(() => {
      if (!hash) return;
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      requestAnimationFrame(() => el?.scrollIntoView({ block: "start" }));
   }, [hash]);

   return (
      <div className="space-y-8">
         <PageHeader
            className={`${RESPONSIVE_HEADER} pb-4 [&>div:last-child]:mt-3 [&_h1]:text-[22px] sm:[&_h1]:text-[28px]`}
            title="Ajuda e regulamento"
            description={<span className="hidden sm:inline">O essencial em poucos minutos. A regra completa está no regulamento.</span>}
         />

         <section aria-labelledby="o-que-sao" className="space-y-3">
            <SectionHeading id="o-que-sao" title={WHAT_ARE.title} divider className="mb-3" />
            <p className="text-sm text-foreground">{WHAT_ARE.short}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
               {WHAT_ARE.points.map(p => (
                  <li key={p}>{p}</li>
               ))}
            </ul>
            <HowItWorks />
         </section>

         <section id="o-que-conta" aria-labelledby="o-que-conta-titulo" className="scroll-mt-4 space-y-3">
            <SectionHeading
               id="o-que-conta-titulo"
               title="O que conta como hora"
               hint="Exemplos comuns. Os limites de cada tipo aparecem ao solicitar."
               divider
               className="mb-3"
            />
            <WhatCounts />
         </section>

         <section aria-labelledby="duvidas" className="space-y-4">
            <SectionHeading id="duvidas" title="Dúvidas frequentes" divider className="mb-4" />
            <HelpList items={HELP_ITEMS} />
            <p className="text-sm text-muted-foreground">
               Se a sua dúvida não estiver aqui, procure a coordenação do seu curso pelos canais oficiais. Casos não previstos no
               regulamento são analisados pela Diretoria de Graduação (art. 10).
            </p>
         </section>

         <section aria-labelledby="regulamento" className="space-y-4">
            <SectionHeading id="regulamento" title="Regulamento" divider className="mb-4" />
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
               <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <div>
                     <p className="text-sm font-medium text-foreground">Atividades Complementares: regulamento geral</p>
                     <p className="text-xs text-muted-foreground">
                        Documento de 26/03/2025 (PDF, 9 páginas). A versão aplicável a cada matrícula depende do cadastro institucional.
                     </p>
                  </div>
               </div>
               <div className="flex flex-wrap gap-2">
                  <RegulationLink label="Abrir regulamento" />
                  <RegulationDownload />
               </div>
            </div>
         </section>

         <section aria-labelledby="documentos-por-tipo" className="space-y-4">
            <SectionHeading
               id="documentos-por-tipo"
               title="Atividades, limites e documentos"
               hint="Tipos do catálogo aplicável ao seu curso. Os mesmos dados aparecem ao escolher a atividade."
               divider
               className="mb-4"
            />
            <SearchInput
               aria-label="Buscar tipo de atividade"
               placeholder="Buscar por nome ou código"
               containerClassName="max-w-md"
               className="h-11"
               value={query}
               onChange={e => setQuery(e.target.value)}
            />
            {catalogQ.isLoading ? (
               <Skeleton className="h-40 w-full" />
            ) : (
               <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                  {activities.map(activity => {
                     const p = presentActivity(activity);
                     return (
                        <li key={`${activity.catalogVersion}-${activity.localId}`}>
                           <Collapsible>
                              <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                 <span>
                                    <span className="font-medium text-foreground">{p.shortName}</span>{" "}
                                    <span className="font-mono text-xs text-muted-foreground">{displayCode(activity)}</span>
                                 </span>
                                 <ChevronDown
                                    className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                                    aria-hidden
                                 />
                              </CollapsibleTrigger>
                              <CollapsibleContent className="space-y-2 px-4 pb-4 text-sm">
                                 <p className="text-foreground">{activity.displayName}</p>
                                 <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
                                    {activityRuleLines(activity).map(line => (
                                       <li key={line}>{line}</li>
                                    ))}
                                 </ul>
                                 {documentsOf(activity).length ? (
                                    <p className="text-muted-foreground">
                                       <span className="font-medium text-foreground">Documentos:</span> {documentsOf(activity).join("; ")}
                                    </p>
                                 ) : null}
                                 {activity.exclusions.length ? (
                                    <p className="text-muted-foreground">Não vale para: {activity.exclusions.join("; ")}.</p>
                                 ) : null}
                              </CollapsibleContent>
                           </Collapsible>
                        </li>
                     );
                  })}
                  {activities.length === 0 ? <li className="px-4 py-6 text-sm text-muted-foreground">Nenhum tipo encontrado.</li> : null}
               </ul>
            )}
         </section>
      </div>
   );
}
