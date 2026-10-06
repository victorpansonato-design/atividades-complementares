import { useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import {
   Ban,
   BookOpen,
   Briefcase,
   ChevronDown,
   ChevronRight,
   GraduationCap,
   HeartHandshake,
   Info,
   Languages,
   Lock,
   Luggage,
   MonitorPlay,
   Presentation,
   type LucideIcon,
} from "lucide-react";
import { Callout } from "@/components/ui/callout";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SearchInput } from "@/components/ui/search-input";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { StudentContext } from "../../types/student.schema";
import type { Catalog } from "../../types/catalog.schema";
import { CATEGORIES, POPULAR_ACTIVITIES, displayCode, presentActivity } from "../../content/catalog-presentation";
import { BLOCK_REASON } from "../../content/texts";
import { formatMinutes } from "../../rules/duration";
import type { ActivityAvailability } from "../../rules/limits";
import { matchesQuery, normalizeQuery } from "../../rules/search";
import { Link } from "react-router-dom";
import { useMediaQuery } from "../../hooks/use-media-query";
import { ActivityDetailsPanel } from "./activity-details-panel";
import type { RequestFormValues } from "./form-model";

interface StepActivityProps {
   student: StudentContext;
   catalog: Catalog;
   availability: ActivityAvailability[];
   onActivityChange: (localId: string) => void;
   onContinue: () => void;
   headingRef: React.Ref<HTMLHeadingElement>;
}

const POPULAR_ICONS: Record<string, LucideIcon> = {
   "25_009": Presentation,
   "25_012": MonitorPlay,
   "25_016": GraduationCap,
   "25_025": Briefcase,
   "25_018": HeartHandshake,
   "25_011": Languages,
};

/** Linha de disponibilidade curta e direta. */
function availabilityText(item: ActivityAvailability): { text: string; blocked: boolean } {
   if (item.blockReason) return { text: BLOCK_REASON[item.blockReason].title, blocked: true };
   if (item.semesterLimitMinutes != null) return { text: `Até ${formatMinutes(item.semesterLimitMinutes)} por semestre`, blocked: false };
   if (item.availableMinutes != null) return { text: `Até ${formatMinutes(item.availableMinutes)} disponíveis`, blocked: false };
   return { text: "", blocked: false };
}

/**
 * Passo 1: "O que você fez?". Atalhos para as atividades mais comuns, busca sem
 * acento e lista completa por categoria. Ao tocar, um resumo mostra quanto conta e
 * o que anexar, com o botão para seguir (gaveta no celular, painel no computador).
 */
export function StepActivity({ student, catalog, availability, onActivityChange, onContinue, headingRef }: StepActivityProps) {
   const { watch, formState } = useFormContext<RequestFormValues>();
   const selectedId = watch("activityLocalId");
   const [query, setQuery] = useState("");
   const [sheetOpen, setSheetOpen] = useState(false);
   const [showIneligible, setShowIneligible] = useState(false);
   const isWide = useMediaQuery("(min-width: 1024px)");
   const error = formState.errors.activityLocalId?.message;

   const byId = useMemo(() => new Map(availability.map(a => [a.activity.localId, a])), [availability]);
   const visibleItems = availability.filter(a => a.blockReason !== "not_eligible" || showIneligible || a.activity.localId === selectedId);
   const ineligibleCount = availability.filter(a => a.blockReason === "not_eligible").length;
   const results = query.trim()
      ? visibleItems.filter(item => {
           const p = presentActivity(item.activity);
           return matchesQuery(
              query,
              [p.shortName, item.activity.displayName, p.example, p.keywords],
              [item.activity.localId, item.activity.regulationCode, item.activity.systemCode, displayCode(item.activity)],
           );
        })
      : null;
   const popular = POPULAR_ACTIVITIES.map(p => ({ ...p, item: byId.get(p.localId) })).filter(
      p => p.item && p.item.blockReason !== "not_eligible",
   );
   const selected = byId.get(selectedId);

   function choose(localId: string) {
      onActivityChange(localId);
      if (!isWide) setSheetOpen(true);
   }

   return (
      <div className="space-y-5">
         <div>
            <h2 ref={headingRef} tabIndex={-1} className="font-display text-xl font-medium text-foreground outline-none">
               O que você fez?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
               Escolha a atividade. Antes de continuar, você vê quanto conta e o que anexar.
            </p>
         </div>

         <AutomaticHint />

         {!catalog.submissionAvailable ? (
            <Callout tone="info" icon={Info} title="Envio indisponível para o seu catálogo">
               {catalog.unavailableReason} As atividades abaixo podem ser consultadas.
            </Callout>
         ) : null}

         {error ? (
            <p
               id="ac-activity-error"
               role="alert"
               className="rounded-lg bg-destructive-soft px-3 py-2 text-sm font-medium text-destructive"
            >
               {error}
            </p>
         ) : null}

         <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
            <div className="min-w-0 space-y-6">
               <SearchInput
                  id="ac-activity-search"
                  aria-label="Buscar atividade"
                  placeholder="Buscar: palestra, curso online, estágio…"
                  containerClassName="max-w-none"
                  className="h-12 text-base sm:text-sm"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  aria-describedby="ac-activity-count"
               />

               {results ? (
                  <section aria-label="Resultados da busca" className="space-y-2">
                     <p id="ac-activity-count" role="status" className="text-xs text-muted-foreground">
                        {results.length === 1 ? "1 atividade encontrada" : `${results.length} atividades encontradas`}
                     </p>
                     {/bagag/.test(normalizeQuery(query)) ? <AutomaticHint emphasize /> : null}
                     {results.length ? (
                        <ActivityList items={results} selectedId={selectedId} onChoose={choose} />
                     ) : (
                        <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-6 text-center text-sm text-muted-foreground">
                           Nada encontrado. Tente “curso”, “evento”, “estágio” ou o código.
                        </p>
                     )}
                  </section>
               ) : (
                  <>
                     {popular.length ? (
                        <section aria-labelledby="ac-popular" className="space-y-2">
                           <h3 id="ac-popular" className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                              Mais comuns
                           </h3>
                           <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {popular.map(({ localId, label, item }) => {
                                 const Icon = POPULAR_ICONS[localId] ?? BookOpen;
                                 const info = availabilityText(item!);
                                 const isSelected = selectedId === localId;
                                 return (
                                    <li key={localId}>
                                       <button
                                          type="button"
                                          onClick={() => choose(localId)}
                                          aria-pressed={isSelected}
                                          className={cn(
                                             "flex h-full min-h-24 w-full flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                             isSelected
                                                ? "border-primary bg-primary-soft/50"
                                                : "border-border bg-card hover:bg-surface active:bg-surface",
                                          )}
                                       >
                                          <Icon
                                             className={cn("size-5", info.blocked ? "text-muted-foreground" : "text-primary")}
                                             aria-hidden
                                          />
                                          <span className="text-sm font-medium leading-snug text-foreground">{label}</span>
                                          <span
                                             className={cn(
                                                "mt-auto text-xs",
                                                info.blocked ? "text-warning-foreground" : "text-muted-foreground",
                                             )}
                                          >
                                             {info.text}
                                          </span>
                                       </button>
                                    </li>
                                 );
                              })}
                           </ul>
                        </section>
                     ) : null}

                     <section aria-labelledby="ac-all" className="space-y-2">
                        <h3 id="ac-all" className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                           Todas as atividades
                        </h3>
                        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                           {CATEGORIES.map(category => {
                              const items = visibleItems.filter(i => presentActivity(i.activity).category === category.id);
                              if (!items.length) return null;
                              const hasSelected = items.some(i => i.activity.localId === selectedId);
                              return (
                                 <Collapsible key={category.id} defaultOpen={hasSelected}>
                                    <CollapsibleTrigger className="group flex min-h-14 w-full items-center gap-3 px-4 text-left text-sm font-medium text-foreground hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                                       <span className="flex-1">{category.label}</span>
                                       <span className="text-xs font-normal text-muted-foreground tabular">{items.length}</span>
                                       <ChevronDown
                                          className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                                          aria-hidden
                                       />
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="px-2 pb-2">
                                       <ActivityList items={items} selectedId={selectedId} onChoose={choose} flush />
                                    </CollapsibleContent>
                                 </Collapsible>
                              );
                           })}
                        </div>
                        {ineligibleCount > 0 ? (
                           <p className="text-xs text-muted-foreground">
                              {showIneligible
                                 ? "Aproveitamentos que não se aplicam ao seu perfil aparecem só para consulta."
                                 : `${ineligibleCount} ${ineligibleCount === 1 ? "aproveitamento não se aplica" : "aproveitamentos não se aplicam"} ao seu perfil de ingresso.`}{" "}
                              <button
                                 type="button"
                                 className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline"
                                 onClick={() => setShowIneligible(v => !v)}
                              >
                                 {showIneligible ? "Ocultar" : "Consultar mesmo assim"}
                              </button>
                           </p>
                        ) : null}
                     </section>
                  </>
               )}
            </div>

            {isWide ? (
               <aside className="lg:sticky lg:top-4 lg:self-start" aria-label="Atividade selecionada">
                  {selected ? (
                     <div className="rounded-xl border border-primary/30 bg-card p-5 shadow-sm">
                        <ActivityDetailsPanel availability={selected} student={student} onContinue={onContinue} />
                     </div>
                  ) : (
                     <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-muted-foreground">
                        Escolha uma atividade para ver quanto conta e o que você vai anexar.
                     </div>
                  )}
               </aside>
            ) : null}
         </div>

         {!isWide ? (
            <Sheet open={sheetOpen && !!selected} onOpenChange={setSheetOpen}>
               <SheetContent
                  side="bottom"
                  className="max-h-[88svh] overflow-y-auto rounded-t-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
                  aria-describedby={undefined}
               >
                  <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border" aria-hidden />
                  <SheetTitle className="sr-only">{selected ? presentActivity(selected.activity).shortName : "Atividade"}</SheetTitle>
                  <SheetDescription className="sr-only">Resumo da atividade escolhida</SheetDescription>
                  {selected ? (
                     <ActivityDetailsPanel
                        availability={selected}
                        student={student}
                        onContinue={() => {
                           setSheetOpen(false);
                           onContinue();
                        }}
                        onChooseAnother={() => setSheetOpen(false)}
                     />
                  ) : null}
               </SheetContent>
            </Sheet>
         ) : null}
      </div>
   );
}

function ActivityList({
   items,
   selectedId,
   onChoose,
   flush,
}: {
   items: ActivityAvailability[];
   selectedId: string;
   onChoose: (id: string) => void;
   flush?: boolean;
}) {
   return (
      <ul className={cn("space-y-1", !flush && "overflow-hidden rounded-xl border border-border bg-card p-1")}>
         {items.map(item => {
            const p = presentActivity(item.activity);
            const info = availabilityText(item);
            const isSelected = item.activity.localId === selectedId;
            const Icon = item.blockReason === "reserved_in_review" ? Lock : Ban;
            return (
               <li key={item.activity.localId}>
                  <button
                     type="button"
                     id={`ac-activity-${item.activity.localId}`}
                     onClick={() => onChoose(item.activity.localId)}
                     aria-pressed={isSelected}
                     className={cn(
                        "flex min-h-14 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isSelected ? "bg-primary-soft" : "hover:bg-surface active:bg-surface",
                     )}
                  >
                     <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-snug text-foreground">{p.shortName}</span>
                        <span
                           className={cn(
                              "mt-0.5 flex items-center gap-1 text-xs",
                              info.blocked ? "text-warning-foreground" : "text-muted-foreground",
                           )}
                        >
                           {info.blocked ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
                           {info.text}
                        </span>
                     </span>
                     <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
               </li>
            );
         })}
      </ul>
   );
}

/** Evita pedido em duplicidade: Bagagens e eventos institucionais entram sozinhos. */
function AutomaticHint({ emphasize }: { emphasize?: boolean }) {
   return (
      <p
         className={cn(
            "flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm",
            emphasize ? "border border-success/40 bg-success-soft text-foreground" : "bg-surface text-muted-foreground",
         )}
      >
         <Luggage className={cn("mt-0.5 size-4 shrink-0", emphasize ? "text-success" : "text-primary")} aria-hidden />
         <span>
            {emphasize ? <strong className="font-semibold">Bagagens não precisam ser solicitadas. </strong> : null}
            Bagagens e eventos da UniAnchieta entram sozinhos no seu histórico.{" "}
            <Link to="/bagagens" className="font-medium text-primary underline underline-offset-4">
               Ver Bagagens
            </Link>
         </span>
      </p>
   );
}
