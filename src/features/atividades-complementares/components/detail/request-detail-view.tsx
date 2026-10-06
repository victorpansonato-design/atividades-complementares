import type { ReactNode } from "react";
import {
   AlertTriangle,
   ArrowLeft,
   Building2,
   ChevronDown,
   CheckCircle2,
   Clock3,
   FilePen,
   History,
   Info,
   RotateCcw,
   XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { RefId } from "@/components/ui/ref-id";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";
import { useBudgets, useRequest, useStudentContext } from "../../api/queries";
import { isGatewayError } from "../../types/gateway";
import type { ActivityType } from "../../types/catalog.schema";
import type { Budget } from "../../types/budget.schema";
import type { ActivityRequest, Attachment } from "../../types/request.schema";
import type { StudentContext } from "../../types/student.schema";
import { displayCode, presentActivity } from "../../content/catalog-presentation";
import { HISTORY_LABEL, statusOf } from "../../content/texts";
import { computeTypeBalance, findBudget } from "../../rules/budget";
import { formatDateRange, formatIsoDate, formatTimestamp } from "../../rules/dates";
import { formatMinutes } from "../../rules/duration";
import { requirementLabel, resolveRequirements } from "../../rules/requirements";
import { correctionAvailability, isPartialApproval, reconsiderationAvailability } from "../../rules/status";
import { useActivityLookup } from "../../hooks/use-activity-lookup";
import { AttachmentList } from "../common/attachment-list";
import { LoadError, PageSkeleton } from "../common/query-states";
import { StatusBadge } from "../common/status-badge";
import { RESPONSIVE_HEADER } from "../tracking/tracking-view";

export function BackToTracking() {
   return (
      <Link to="/" className="inline-flex h-11 items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline">
         <ArrowLeft className="size-4" aria-hidden /> Voltar para Minhas horas
      </Link>
   );
}

export function RequestNotFound() {
   return (
      <div className="space-y-6">
         <BackToTracking />
         <EmptyState
            title="Pedido não encontrado."
            hint="Ele pode ter sido removido ao restaurar a demonstração."
            actions={<BackToTracking />}
         />
      </div>
   );
}

function periodLabel(student: StudentContext, id: string): string {
   return student.academicPeriods.find(p => p.id === id)?.label ?? id;
}

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
   return (
      <div className={cn("min-w-0", wide && "sm:col-span-2")}>
         <dt className="text-xs text-muted-foreground">{label}</dt>
         <dd className="mt-0.5 wrap-break-word text-sm text-foreground">{children}</dd>
      </div>
   );
}

function requirementLabels(activity: ActivityType | undefined, modeId: string | null): Record<string, string> {
   if (!activity) return {};
   return Object.fromEntries((resolveRequirements(activity, modeId) ?? []).map(r => [r.key, requirementLabel(r)]));
}

export function RequestDetailView({ requestId }: { requestId: string }) {
   const studentQ = useStudentContext();
   const requestQ = useRequest(requestId);
   const budgetsQ = useBudgets();
   const lookup = useActivityLookup();

   if (studentQ.isLoading || requestQ.isLoading) return <PageSkeleton />;
   if (requestQ.isError && isGatewayError(requestQ.error) && requestQ.error.code === "nao_encontrado") return <RequestNotFound />;
   if (!studentQ.data || !requestQ.data)
      return <LoadError title="Não foi possível carregar o pedido." onRetry={() => requestQ.refetch()} />;

   const student = studentQ.data;
   const request = requestQ.data;
   const activity = lookup(request.catalogVersion, request.activityLocalId);
   const presentation = activity ? presentActivity(activity) : null;
   const correction = correctionAvailability(request, student);
   const reconsideration = reconsiderationAvailability(request, student);
   const mode = activity?.unitRule?.modes?.find(m => m.id === request.modeId);
   const labels = requirementLabels(activity, request.modeId);
   const budget = activity && budgetsQ.data ? findBudget(budgetsQ.data.items, activity) : undefined;
   const basePath = `/pedidos/${encodeURIComponent(request.id)}`;

   const action = correction.allowed ? (
      <Link to={`${basePath}/corrigir`} className={cn(buttonVariants({ size: "lg" }), "w-full gap-2 sm:w-auto sm:px-6")}>
         <FilePen className="size-4" aria-hidden /> Corrigir e reenviar
      </Link>
   ) : reconsideration.allowed ? (
      <Link
         to={`${basePath}/reconsiderar`}
         className={cn(buttonVariants({ size: "lg", variant: "outline" }), "w-full gap-2 sm:w-auto sm:px-6")}
      >
         <RotateCcw className="size-4" aria-hidden /> Pedir reconsideração
      </Link>
   ) : null;

   const hoursValue =
      request.approvedMinutes != null && request.status === "aprovada"
         ? request.requestedMinutes != null && request.requestedMinutes !== request.approvedMinutes
            ? `${formatMinutes(request.approvedMinutes)} de ${formatMinutes(request.requestedMinutes)}`
            : formatMinutes(request.approvedMinutes)
         : request.requestedMinutes != null
           ? formatMinutes(request.requestedMinutes)
           : "-";
   const hoursLabel =
      request.origin === "institutional" ? "Horas computadas" : request.status === "aprovada" ? "Horas aprovadas" : "Horas pedidas";

   return (
      <div className="space-y-6">
         <BackToTracking />
         <PageHeader
            className={cn(RESPONSIVE_HEADER, "pb-4 [&>div:last-child]:mt-3 [&_h1]:text-[22px] sm:[&_h1]:text-[26px]")}
            eyebrow={presentation?.shortName ?? (request.origin === "institutional" ? "Registro institucional" : "Pedido")}
            title={<span className="wrap-break-word">{request.title}</span>}
            meta={
               <>
                  <StatusBadge status={statusOf(request)} />
                  {request.protocol ? (
                     <span>
                        Protocolo <RefId value={request.protocol} />
                     </span>
                  ) : null}
                  {request.eventId ? (
                     <span>
                        Evento <RefId value={request.eventId} muted />
                     </span>
                  ) : null}
               </>
            }
         />

         <section aria-label="Situação" className="space-y-3">
            <DecisionCallout request={request} student={student} />
            {action}
            {request.fixtureNotice ? <p className="text-xs text-muted-foreground">Nota da demonstração: {request.fixtureNotice}</p> : null}
         </section>

         <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
               [hoursLabel, hoursValue],
               ["Período", periodLabel(student, request.academicPeriodId)],
               ["Data", formatDateRange(request.startDate, request.endDate)],
            ].map(([label, value], i) => (
               <div
                  key={label}
                  className={cn("rounded-xl border border-border bg-card px-3 py-2.5", i === 2 && "col-span-2 sm:col-span-1")}
               >
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 font-semibold text-foreground tabular">{value}</dd>
               </div>
            ))}
         </dl>

         {request.origin === "manual" ? (
            <section aria-labelledby="anexos" className="space-y-4">
               <SectionHeading
                  id="anexos"
                  title="Comprovantes"
                  hint={request.currentVersion > 1 ? `Versão ${request.currentVersion} do pedido` : undefined}
                  divider
                  className="mb-4"
               />
               <AttachmentList attachments={request.attachments} requirementLabels={labels} />
            </section>
         ) : null}

         {request.reconsiderations.length > 0 ? <ReconsiderationsSection request={request} student={student} /> : null}
         {request.previousVersions.length > 0 ? <VersionsSection request={request} student={student} labels={labels} /> : null}

         <Collapsible className="rounded-xl border border-border bg-card">
            <CollapsibleTrigger className="group flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left text-sm font-medium text-foreground sm:px-5">
               Mais detalhes
               <ChevronDown
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                  aria-hidden
               />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-6 px-4 pb-5 sm:px-5">
               <dl className="grid gap-4 sm:grid-cols-2">
                  <Field label="Tipo de atividade" wide>
                     {presentation?.shortName ?? "Tipo sem regra disponível"}
                     {mode ? ` · ${mode.label}` : ""}{" "}
                     <span className="font-mono text-xs text-muted-foreground">
                        ({activity ? displayCode(activity) : request.activityLocalId})
                     </span>
                     {activity ? <span className="mt-1 block text-xs text-muted-foreground">{activity.displayName}</span> : null}
                  </Field>
                  {request.organizer ? <Field label={presentation?.organizerLabel ?? "Organizador"}>{request.organizer}</Field> : null}
                  {request.certificateMinutes != null ? (
                     <Field label="Horas do comprovante">{formatMinutes(request.certificateMinutes)}</Field>
                  ) : null}
                  {request.requestedMinutes != null ? (
                     <Field label="Horas solicitadas">{formatMinutes(request.requestedMinutes)}</Field>
                  ) : null}
                  {request.reservedMinutes > 0 ? (
                     <Field label="Reservadas no saldo até a decisão">{formatMinutes(request.reservedMinutes)}</Field>
                  ) : null}
                  {request.submittedAt ? <Field label="Enviado em">{formatTimestamp(request.submittedAt, student.timeZone)}</Field> : null}
                  <Field label="Última atualização">{formatTimestamp(request.updatedAt, student.timeZone)}</Field>
                  <Field label="Descrição enviada" wide>
                     <span className="whitespace-pre-line">{request.description}</span>
                  </Field>
               </dl>
               <TypeBudgetSection activity={activity} budget={budget} />
            </CollapsibleContent>
         </Collapsible>

         <section aria-labelledby="historico" className="space-y-4">
            <SectionHeading id="historico" title="Histórico" divider className="mb-4" />
            <ol className="relative space-y-4 border-l border-border pl-5">
               {[...request.history].reverse().map((event, index) => (
                  <li key={`${event.event}-${event.occurredAt}-${index}`} className="relative">
                     <span
                        className="absolute -left-[27px] top-1 grid size-3 place-items-center rounded-full border-2 border-canvas bg-primary"
                        aria-hidden
                     />
                     <p className="text-sm font-medium text-foreground">
                        {request.origin === "institutional" && event.event === "aprovada"
                           ? "Registrada pela instituição"
                           : HISTORY_LABEL[event.event]}
                     </p>
                     <p className="text-xs text-muted-foreground">{formatTimestamp(event.occurredAt, student.timeZone)}</p>
                     {event.note ? <p className="mt-1 text-sm text-muted-foreground">{event.note}</p> : null}
                  </li>
               ))}
            </ol>
         </section>
      </div>
   );
}

function DecisionCallout({ request, student }: { request: ActivityRequest; student: StudentContext }) {
   const correction = correctionAvailability(request, student);
   const reconsideration = reconsiderationAvailability(request, student);
   const sla = student.policies.analysisSlaBusinessDays;
   const mockNote = request.deadlineIsMock ? " (prazo fictício da demonstração)" : "";

   if (request.origin === "institutional") {
      return (
         <Callout tone="info" icon={Building2} title="Registrada automaticamente pela instituição">
            Este evento foi lançado pela instituição e já conta no seu progresso. Não tem protocolo nem horas solicitadas, e não é preciso
            enviá-lo.
         </Callout>
      );
   }
   switch (request.status) {
      case "em_analise":
         return (
            <Callout tone="info" icon={Clock3} title="Em análise">
               A coordenação vai analisar os documentos e decidir as horas.
               {sla ? ` Prazo informado para análise: até ${sla} dias úteis.` : ""} As horas ficam reservadas no saldo deste tipo até a
               decisão e ainda não contam no progresso.
            </Callout>
         );
      case "reconsideracao_em_analise":
         return (
            <Callout tone="info" icon={RotateCcw} title="Reconsideração em análise">
               Seu pedido de reconsideração está vinculado a este protocolo. As horas ficam reservadas uma única vez até a nova decisão.
            </Callout>
         );
      case "precisa_correcao":
         return (
            <Callout tone="warning" icon={AlertTriangle} title="Precisa de correção">
               <span className="block font-medium">{request.correctionReason ?? "A coordenação pediu ajustes neste pedido."}</span>
               <span className="mt-1 block">
                  {correction.allowed
                     ? correction.deadline
                        ? `Responda até ${formatIsoDate(correction.deadline)}${mockNote}. O protocolo continua o mesmo.`
                        : "O protocolo continua o mesmo."
                     : `O prazo para responder terminou em ${formatIsoDate(correction.deadline)}${mockNote}. Procure a coordenação do curso pelos canais oficiais.`}
               </span>
            </Callout>
         );
      case "nao_aprovada":
         return (
            <Callout tone="danger" icon={XCircle} title="Não aprovada">
               <span className="block">{request.decisionReason ?? "A coordenação não aprovou este pedido."}</span>
               <span className="mt-1 block">
                  {reconsideration.allowed
                     ? `Você pode pedir reconsideração até ${formatIsoDate(reconsideration.deadline)}${mockNote}.`
                     : reconsideration.reason === "deadline_expired"
                       ? `O prazo para pedir reconsideração terminou em ${formatIsoDate(reconsideration.deadline)}${mockNote}.`
                       : reconsideration.reason === "attempts_exhausted"
                         ? "A reconsideração deste pedido já foi analisada."
                         : reconsideration.reason === "deadline_unknown"
                           ? "O prazo para reconsideração não foi informado. Procure a coordenação do curso."
                           : null}
               </span>
            </Callout>
         );
      case "aprovada": {
         const partial = isPartialApproval(request);
         const diff = (request.requestedMinutes ?? 0) - (request.approvedMinutes ?? 0);
         return (
            <Callout tone="success" icon={CheckCircle2} title={partial ? "Aprovada parcialmente" : "Aprovada"}>
               {partial ? (
                  <span className="block">
                     Foram aprovadas {formatMinutes(request.approvedMinutes ?? 0)} de {formatMinutes(request.requestedMinutes ?? 0)}{" "}
                     solicitadas. As {formatMinutes(diff)} restantes não foram computadas e voltaram para o saldo deste tipo.
                  </span>
               ) : (
                  <span className="block">{formatMinutes(request.approvedMinutes ?? 0)} contam no seu progresso.</span>
               )}
               {request.decisionReason ? <span className="mt-1 block">Motivo: {request.decisionReason}</span> : null}
            </Callout>
         );
      }
   }
}

function TypeBudgetSection({ activity, budget }: { activity: ActivityType | undefined; budget: Budget | undefined }) {
   return (
      <section aria-labelledby="saldo-tipo" className="space-y-4">
         <SectionHeading id="saldo-tipo" title="Saldo deste tipo" divider className="mb-4" />
         {!activity || activity.totalLimitMinutes == null ? (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
               <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
               Este código não tem regra de limite disponível. As horas aprovadas contam no total do curso, mas não há saldo calculado para
               ele.
            </p>
         ) : (
            <>
               <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                     ["Limite total", activity.totalLimitMinutes],
                     ["Aprovadas", budget?.approvedMinutes ?? 0],
                     ["Em análise", budget?.reservedMinutes ?? 0],
                     ["Disponível", budget?.availableMinutes ?? 0],
                  ].map(([label, value]) => (
                     <div key={label as string} className="rounded-lg border border-border bg-surface px-3 py-2">
                        <dt className="text-xs text-muted-foreground">{label}</dt>
                        <dd className="font-semibold text-foreground tabular">{formatMinutes(value as number)}</dd>
                     </div>
                  ))}
               </dl>
               {budget && computeTypeBalance(budget).reason === "approved_limit_reached" ? (
                  <p className="text-sm font-medium text-foreground">Limite deste tipo atingido.</p>
               ) : null}
               {activity.historicalOnly ? <p className="text-xs text-muted-foreground">{activity.provenanceNote}</p> : null}
            </>
         )}
      </section>
   );
}

function ReconsiderationsSection({ request, student }: { request: ActivityRequest; student: StudentContext }) {
   return (
      <section aria-labelledby="reconsideracoes" className="space-y-4">
         <SectionHeading
            id="reconsideracoes"
            title="Reconsideração"
            hint={`Vinculada ao protocolo ${request.protocol ?? request.id}`}
            divider
            className="mb-4"
         />
         <ul className="space-y-3">
            {request.reconsiderations.map(attempt => (
               <li key={attempt.attempt} className="space-y-2 rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-medium text-foreground">
                     Tentativa {attempt.attempt} · enviada em {formatTimestamp(attempt.submittedAt, student.timeZone)} ·{" "}
                     {attempt.status === "em_analise" ? "Em análise" : attempt.status === "aprovada" ? "Aprovada" : "Não aprovada"}
                  </p>
                  <p className="whitespace-pre-line text-sm text-muted-foreground">{attempt.justification}</p>
                  {attempt.decisionReason ? <p className="text-sm text-foreground">Decisão: {attempt.decisionReason}</p> : null}
                  <AttachmentList attachments={attempt.attachments} emptyText="Sem documentos complementares." />
               </li>
            ))}
         </ul>
      </section>
   );
}

function VersionsSection({
   request,
   student,
   labels,
}: {
   request: ActivityRequest;
   student: StudentContext;
   labels: Record<string, string>;
}) {
   return (
      <section aria-labelledby="versoes" className="space-y-4">
         <SectionHeading id="versoes" title="Versões anteriores" hint="Preservadas no mesmo protocolo." divider className="mb-4" />
         <ul className="space-y-2">
            {[...request.previousVersions].reverse().map(version => (
               <li key={version.version} className="rounded-xl border border-border bg-card">
                  <Collapsible>
                     <CollapsibleTrigger className="flex min-h-11 w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <History className="size-4 text-muted-foreground" aria-hidden />
                        Versão {version.version}
                        {version.submittedAt ? ` · enviada em ${formatTimestamp(version.submittedAt, student.timeZone)}` : ""}
                     </CollapsibleTrigger>
                     <CollapsibleContent className="space-y-3 px-4 pb-4 text-sm">
                        {version.correctionReason ? <p className="text-foreground">Correção pedida: {version.correctionReason}</p> : null}
                        {version.studentResponse ? (
                           <p className="text-muted-foreground">Sua resposta na versão seguinte: {version.studentResponse}</p>
                        ) : null}
                        <p className="text-muted-foreground">
                           {formatDateRange(version.startDate, version.endDate)} · solicitadas{" "}
                           {formatMinutes(version.requestedMinutes ?? 0)}
                        </p>
                        <AttachmentList attachments={version.attachments as Attachment[]} requirementLabels={labels} />
                     </CollapsibleContent>
                  </Collapsible>
               </li>
            ))}
         </ul>
      </section>
   );
}
