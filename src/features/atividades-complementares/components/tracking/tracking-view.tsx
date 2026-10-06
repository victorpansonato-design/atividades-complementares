import { useMemo, useState, type ReactNode } from "react";
import { CalendarClock, CheckCircle2, ClipboardList, Info, Plus, SearchX } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AsyncState } from "@/components/ui/async-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDeleteDraft } from "../../api/mutations";
import { useDrafts, useRequests, useStudentContext, useSummary } from "../../api/queries";
import { displayCode, presentActivity } from "../../content/catalog-presentation";
import { useActivityLookup } from "../../hooks/use-activity-lookup";
import { STATUS_FILTERS, useTrackingFilters, type StatusFilter } from "../../hooks/use-tracking-filters";
import type { ActivityRequest, Draft } from "../../types/request.schema";
import type { StudentContext } from "../../types/student.schema";
import { computeSubmissionWindow, formatIsoDate } from "../../rules/dates";
import { matchesQuery } from "../../rules/search";
import { actionPriority } from "../../rules/status";
import { LoadError, PageSkeleton } from "../common/query-states";
import { RegulationLink } from "../common/regulation-links";
import { QuickLinks, WhatAreCard } from "../basics/basics";
import { ProgressSummary } from "./progress-summary";
import { DraftListItem, RequestListItem } from "./request-list-item";

/** Cabeçalho empilha título e ações no celular, sem rolagem horizontal. */
export const RESPONSIVE_HEADER =
   "[&>div:first-child]:flex-col [&>div:first-child]:items-stretch [&>div:first-child]:gap-4 sm:[&>div:first-child]:flex-row sm:[&>div:first-child]:items-end [&>div:first-child>div:last-child]:flex-wrap";

const PAGE_SIZE = 10;

function matchesStatus(request: ActivityRequest, filter: StatusFilter): boolean {
   switch (filter) {
      case "todos":
         return true;
      case "em-analise":
         return request.status === "em_analise" || request.status === "reconsideracao_em_analise";
      case "correcao":
         return request.status === "precisa_correcao";
      case "aprovadas":
         return request.status === "aprovada";
      case "nao-aprovadas":
         return request.status === "nao_aprovada";
   }
}

/** Ordenação estável: ação necessária primeiro (ou só data), depois atualização mais recente, depois id. */
function sortRequests(requests: ActivityRequest[], student: StudentContext, order: "acao" | "recentes"): ActivityRequest[] {
   return [...requests].sort((a, b) => {
      if (order === "acao") {
         const diff = actionPriority(a, student) - actionPriority(b, student);
         if (diff !== 0) return diff;
      }
      const byDate = b.updatedAt.localeCompare(a.updatedAt);
      return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
   });
}

type Group = "precisa" | "analise" | "concluidos";

function groupOf(request: ActivityRequest): Group {
   if (request.status === "precisa_correcao") return "precisa";
   if (request.status === "em_analise" || request.status === "reconsideracao_em_analise") return "analise";
   return "concluidos";
}

const GROUP_TITLE: Record<Group, string> = {
   precisa: "Precisa de você",
   analise: "Em análise",
   concluidos: "Concluídos",
};

function scrollToSection(id: string) {
   const el = document.getElementById(id);
   el?.scrollIntoView({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
   el?.focus({ preventScroll: true });
}

/**
 * Página inicial do módulo. Ordem pensada para o celular:
 * 1) quanto falta; 2) o que precisa do aluno; 3) o que está em análise; 4) histórico.
 * A lista é a mesma (sem duplicar registros): agrupada por situação, ou filtrada.
 */
export function TrackingView() {
   const studentQuery = useStudentContext();
   const summaryQuery = useSummary();
   const requestsQuery = useRequests();
   const draftsQuery = useDrafts();
   const lookup = useActivityLookup();
   const { filters, setSearch, setStatus, clear } = useTrackingFilters();
   const [visible, setVisible] = useState(PAGE_SIZE);
   const [searchText, setSearchText] = useState(filters.search);
   const [draftToDelete, setDraftToDelete] = useState<Draft | null>(null);
   const deleteDraft = useDeleteDraft();

   const student = studentQuery.data;
   const requests = useMemo(() => requestsQuery.data ?? [], [requestsQuery.data]);
   const drafts = useMemo(() => draftsQuery.data ?? [], [draftsQuery.data]);

   const filtered = useMemo(() => {
      if (!student) return [];
      const list = requests.filter(r => {
         if (!matchesStatus(r, filters.status)) return false;
         const activity = lookup(r.catalogVersion, r.activityLocalId);
         return matchesQuery(
            filters.search,
            [r.title, activity?.displayName, activity ? presentActivity(activity).shortName : null],
            [r.protocol, r.eventId, r.activityLocalId, activity ? displayCode(activity) : null, activity?.regulationCode],
         );
      });
      return sortRequests(list, student, filters.order);
   }, [requests, filters, lookup, student]);

   const filteredDrafts = useMemo(
      () => (filters.status === "todos" ? drafts.filter(d => matchesQuery(filters.search, [d.title, d.activityLocalId])) : []),
      [drafts, filters],
   );

   if (studentQuery.isLoading) return <PageSkeleton />;
   if (studentQuery.isError || !student)
      return <LoadError title="Não foi possível carregar seus dados." onRetry={() => studentQuery.refetch()} />;

   const submissionWindow = computeSubmissionWindow(student);
   const counts = Object.fromEntries(STATUS_FILTERS.map(f => [f.id, requests.filter(r => matchesStatus(r, f.id)).length]));
   const needsYou = requests.filter(r => r.status === "precisa_correcao").length + drafts.length;
   const hasAnything = requests.length > 0 || drafts.length > 0;
   const hasFilters = filters.status !== "todos" || filters.search !== "";
   const grouped = !hasFilters;
   const isEmpty = filtered.length === 0 && filteredDrafts.length === 0;

   const renderRequest = (r: ActivityRequest) => (
      <li key={r.id}>
         <RequestListItem request={r} activity={lookup(r.catalogVersion, r.activityLocalId)} student={student} />
      </li>
   );
   const renderDraft = (d: Draft) => (
      <li key={`d-${d.id}`}>
         <DraftListItem
            draft={d}
            activity={d.activityLocalId ? lookup(d.catalogVersion, d.activityLocalId) : undefined}
            onDelete={setDraftToDelete}
         />
      </li>
   );

   return (
      <div className="space-y-5">
         <PageHeader
            className={cn(RESPONSIVE_HEADER, "pb-4 [&>div:last-child]:mt-3 [&_h1]:text-[22px] sm:[&_h1]:text-[28px]")}
            title="Atividades Complementares"
            description={<span className="hidden sm:inline">Envie suas atividades e acompanhe as horas aprovadas.</span>}
            actions={
               <div className="hidden gap-2 sm:flex">
                  <RegulationLink />
                  <Link to="/solicitar" className={cn(buttonVariants({ size: "lg" }), "gap-2 px-6")}>
                     <Plus className="size-4" aria-hidden /> Solicitar horas
                  </Link>
               </div>
            }
         />

         <section aria-label="Resumo das horas" className="space-y-3">
            <AsyncState
               isLoading={summaryQuery.isLoading}
               isError={summaryQuery.isError}
               loading={<Skeleton className="h-52 w-full" />}
               error={<LoadError title="Não foi possível carregar o resumo." onRetry={() => summaryQuery.refetch()} />}
            >
               {summaryQuery.data ? (
                  <ProgressSummary
                     summary={summaryQuery.data}
                     needsYou={needsYou}
                     action={
                        <Link to="/solicitar" className={cn(buttonVariants({ size: "lg" }), "h-12 w-full gap-2 text-base")}>
                           <Plus className="size-5" aria-hidden /> Solicitar horas
                        </Link>
                     }
                     onGoTo={section => {
                        if (hasFilters) clear();
                        requestAnimationFrame(() => scrollToSection(section === "precisa" ? "grupo-precisa" : "grupo-analise"));
                     }}
                  />
               ) : null}
            </AsyncState>

            {hasAnything ? <QuickLinks /> : <WhatAreCard requiredMinutes={student.requiredMinutes} />}

            {"hybridPolicyUnknown" in submissionWindow ? (
               <Callout tone="warning" icon={Info} title="Prazo de entrega a confirmar">
                  O regulamento não define o prazo de conclusão para cursos híbridos. Confirme a data com a coordenação.
               </Callout>
            ) : submissionWindow.deadline ? (
               <Callout
                  tone={submissionWindow.open ? "info" : "danger"}
                  icon={CalendarClock}
                  title={submissionWindow.open ? `Envie até ${formatIsoDate(submissionWindow.deadline)}` : "Prazo de entrega encerrado"}
               >
                  {submissionWindow.open
                     ? "Você está no semestre de conclusão. Vale também para reconsiderações. O prazo de análise não amplia esta data."
                     : `O prazo para enviar atividades terminou em ${formatIsoDate(submissionWindow.deadline)}.`}
                  {submissionWindow.deadlineIsMock ? " (Data fictícia da demonstração.)" : ""}
               </Callout>
            ) : null}

            {summaryQuery.data?.isComplete ? (
               <Callout tone="success" icon={CheckCircle2} title="Você já cumpriu as horas exigidas">
                  {student.policies.allowNewRequestsAfterCompletion
                     ? "Ainda é possível enviar novos pedidos nesta demonstração. Confirme com a coordenação se precisa."
                     : "Novos pedidos não estão habilitados para o seu curso."}
               </Callout>
            ) : null}
         </section>

         <section aria-labelledby="lista-pedidos" className="space-y-3">
            <h2 id="lista-pedidos" className="font-display text-[17px] font-medium text-foreground">
               Seus pedidos
            </h2>

            {hasAnything ? (
               <div className="space-y-3">
                  <SearchInput
                     aria-label="Buscar por nome, protocolo, código ou evento"
                     placeholder="Buscar por nome, protocolo ou evento"
                     containerClassName="max-w-none sm:max-w-md"
                     className="h-11 text-base sm:text-sm"
                     value={searchText}
                     onChange={e => {
                        setSearchText(e.target.value);
                        setSearch(e.target.value);
                        setVisible(PAGE_SIZE);
                     }}
                  />
                  <div
                     role="group"
                     aria-label="Filtrar por situação"
                     className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
                  >
                     {STATUS_FILTERS.map(f => {
                        const active = filters.status === f.id;
                        return (
                           <Button
                              key={f.id}
                              type="button"
                              variant={active ? "default" : "outline"}
                              aria-pressed={active}
                              className="h-10 shrink-0 gap-1.5 rounded-full px-3.5"
                              onClick={() => {
                                 setStatus(f.id);
                                 setVisible(PAGE_SIZE);
                              }}
                           >
                              {f.label}
                              <span className={cn("text-xs tabular", active ? "opacity-80" : "text-muted-foreground")}>{counts[f.id]}</span>
                           </Button>
                        );
                     })}
                  </div>
               </div>
            ) : null}

            <AsyncState
               isLoading={requestsQuery.isLoading || draftsQuery.isLoading}
               isError={requestsQuery.isError}
               isEmpty={isEmpty}
               loading={
                  <div className="space-y-3">
                     {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 w-full" />
                     ))}
                  </div>
               }
               error={<LoadError title="Não foi possível carregar seus pedidos." onRetry={() => requestsQuery.refetch()} />}
               empty={
                  hasAnything && hasFilters ? (
                     <EmptyState
                        icon={SearchX}
                        title="Nenhum pedido encontrado."
                        hint="Tente outro termo ou situação."
                        actions={
                           <Button
                              variant="outline"
                              className="h-11"
                              onClick={() => {
                                 setSearchText("");
                                 clear();
                              }}
                           >
                              Limpar filtros
                           </Button>
                        }
                     />
                  ) : (
                     <EmptyState
                        icon={ClipboardList}
                        title="Você ainda não enviou atividades."
                        hint="Envie sua primeira atividade. Eventos registrados pela instituição também aparecem aqui."
                        actions={
                           <Link to="/solicitar" className={cn(buttonVariants({ size: "lg" }), "gap-2 px-6")}>
                              <Plus className="size-4" aria-hidden /> Solicitar horas
                           </Link>
                        }
                     />
                  )
               }
            >
               <p className="sr-only" role="status">
                  {filtered.length + filteredDrafts.length === 1 ? "1 item" : `${filtered.length + filteredDrafts.length} itens`}
               </p>
               {grouped ? (
                  <div className="space-y-6">
                     {(["precisa", "analise", "concluidos"] as const).map(group => {
                        const items = filtered.filter(r => groupOf(r) === group);
                        const groupDrafts = group === "precisa" ? filteredDrafts : [];
                        if (!items.length && !groupDrafts.length) return null;
                        const shown = group === "concluidos" ? items.slice(0, visible) : items;
                        return (
                           <GroupSection
                              key={group}
                              id={`grupo-${group}`}
                              title={GROUP_TITLE[group]}
                              count={items.length + groupDrafts.length}
                              tone={group === "precisa" ? "warning" : "neutral"}
                           >
                              {items.filter(r => r.status === "precisa_correcao").map(renderRequest)}
                              {groupDrafts.map(renderDraft)}
                              {shown.filter(r => r.status !== "precisa_correcao").map(renderRequest)}
                              {group === "concluidos" && items.length > visible ? (
                                 <li className="flex justify-center pt-1">
                                    <Button variant="outline" className="h-11" onClick={() => setVisible(v => v + PAGE_SIZE)}>
                                       Mostrar mais ({items.length - visible})
                                    </Button>
                                 </li>
                              ) : null}
                           </GroupSection>
                        );
                     })}
                  </div>
               ) : (
                  <ul className="space-y-3">
                     {filteredDrafts.map(renderDraft)}
                     {filtered.slice(0, visible).map(renderRequest)}
                     {filtered.length > visible ? (
                        <li className="flex justify-center">
                           <Button variant="outline" className="h-11" onClick={() => setVisible(v => v + PAGE_SIZE)}>
                              Mostrar mais ({filtered.length - visible})
                           </Button>
                        </li>
                     ) : null}
                  </ul>
               )}
            </AsyncState>

            <div className="pt-2 sm:hidden">
               <RegulationLink className="w-full" />
            </div>
         </section>

         <Dialog open={!!draftToDelete} onOpenChange={open => !open && setDraftToDelete(null)}>
            <DialogContent>
               <DialogHeader>
                  <DialogTitle>Excluir rascunho?</DialogTitle>
                  <DialogDescription>
                     O rascunho “{draftToDelete?.title || "sem nome"}” e os arquivos guardados neste dispositivo serão apagados. Nada foi
                     enviado para análise.
                  </DialogDescription>
               </DialogHeader>
               <DialogFooter>
                  <Button variant="outline" className="h-11" onClick={() => setDraftToDelete(null)}>
                     Manter rascunho
                  </Button>
                  <Button
                     variant="destructive"
                     className="h-11"
                     disabled={deleteDraft.isPending}
                     onClick={() => {
                        if (!draftToDelete) return;
                        deleteDraft.mutate(draftToDelete.id, {
                           onSuccess: () => {
                              toast.success("Rascunho excluído.");
                              setDraftToDelete(null);
                           },
                           onError: () => toast.error("Não foi possível excluir o rascunho. Tente novamente."),
                        });
                     }}
                  >
                     Excluir rascunho
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>
   );
}

function GroupSection({
   id,
   title,
   count,
   tone,
   children,
}: {
   id: string;
   title: string;
   count: number;
   tone: "warning" | "neutral";
   children: ReactNode;
}) {
   return (
      <section id={id} tabIndex={-1} aria-labelledby={`${id}-title`} className="scroll-mt-4 space-y-2 outline-none">
         <h3 id={`${id}-title`} className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {tone === "warning" ? <span className="size-2 rounded-full bg-warning" aria-hidden /> : null}
            {title}
            <span className="font-normal text-muted-foreground tabular">({count})</span>
         </h3>
         <ul className="space-y-3">{children}</ul>
      </section>
   );
}
