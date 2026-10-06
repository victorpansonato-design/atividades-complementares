import { ChevronRight, FilePen, RotateCcw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActivityType } from "../../types/catalog.schema";
import type { ActivityRequest, Draft } from "../../types/request.schema";
import type { StudentContext } from "../../types/student.schema";
import { presentActivity } from "../../content/catalog-presentation";
import { STATUS, statusOf } from "../../content/texts";
import { formatDateRange, formatIsoDate, formatTimestamp } from "../../rules/dates";
import { formatMinutes } from "../../rules/duration";
import { correctionAvailability, isPartialApproval, reconsiderationAvailability } from "../../rules/status";
import { StatusBadge } from "../common/status-badge";

/** Horas mais relevantes para o estado, em uma linha. */
function hoursLine(request: ActivityRequest): string {
   if (request.origin === "institutional") return `${formatMinutes(request.approvedMinutes ?? 0)} computadas`;
   if (request.status === "aprovada") {
      return isPartialApproval(request)
         ? `${formatMinutes(request.approvedMinutes ?? 0)} de ${formatMinutes(request.requestedMinutes ?? 0)}`
         : `${formatMinutes(request.approvedMinutes ?? 0)} aprovadas`;
   }
   if (request.status === "nao_aprovada") return `${formatMinutes(request.requestedMinutes ?? 0)} pedidas`;
   return `${formatMinutes(request.requestedMinutes ?? 0)} pedidas`;
}

/**
 * Cartão compacto: o cartão inteiro abre o detalhe. Só pedidos que exigem ação
 * ganham um botão próprio (corrigir / reconsiderar).
 */
export function RequestListItem({
   request,
   activity,
   student,
}: {
   request: ActivityRequest;
   activity: ActivityType | undefined;
   student: StudentContext;
}) {
   const status = statusOf(request);
   const correction = correctionAvailability(request, student);
   const reconsideration = reconsiderationAvailability(request, student);
   const presentation = activity ? presentActivity(activity) : null;
   const detailsPath = `/pedidos/${encodeURIComponent(request.id)}`;
   const period = student.academicPeriods.find(p => p.id === request.academicPeriodId)?.label;

   return (
      <article
         className={cn(
            "overflow-hidden rounded-xl border bg-card shadow-xs",
            request.status === "precisa_correcao" ? "border-warning/60" : "border-border",
         )}
      >
         <Link
            to={detailsPath}
            className="flex items-start gap-3 p-4 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:bg-surface"
         >
            <span className="min-w-0 flex-1">
               <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <StatusBadge status={status} className="px-2 py-0.5 text-[11px]" />
                  <span className="text-xs text-muted-foreground tabular">{hoursLine(request)}</span>
               </span>
               <span className="mt-1.5 block wrap-break-word text-[15px] font-semibold leading-snug text-foreground">{request.title}</span>
               <span className="mt-0.5 block text-xs text-muted-foreground">
                  {presentation?.shortName ?? "Tipo sem regra disponível"} · {period ? `${period} · ` : ""}
                  {formatDateRange(request.startDate, request.endDate)}
               </span>
               {request.status === "precisa_correcao" && request.correctionReason ? (
                  <span className="mt-2 block rounded-md bg-warning-soft px-2.5 py-1.5 text-sm text-warning-foreground">
                     {request.correctionReason}
                     {correction.deadline ? (
                        <span className="block text-xs">
                           {correction.allowed
                              ? `Responda até ${formatIsoDate(correction.deadline)}`
                              : `Prazo encerrado em ${formatIsoDate(correction.deadline)}`}
                        </span>
                     ) : null}
                  </span>
               ) : null}
            </span>
            <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="sr-only">Ver detalhes</span>
         </Link>
         {correction.allowed || reconsideration.allowed ? (
            <div className="border-t border-border px-4 py-3">
               {correction.allowed ? (
                  <Link to={`${detailsPath}/corrigir`} className={cn(buttonVariants(), "h-11 w-full gap-2 sm:w-auto")}>
                     <FilePen className="size-4" aria-hidden /> Corrigir agora
                  </Link>
               ) : (
                  <Link
                     to={`${detailsPath}/reconsiderar`}
                     className={cn(buttonVariants({ variant: "outline" }), "h-11 w-full gap-2 sm:w-auto")}
                  >
                     <RotateCcw className="size-4" aria-hidden /> Pedir reconsideração
                  </Link>
               )}
            </div>
         ) : null}
      </article>
   );
}

export function DraftListItem({
   draft,
   activity,
   onDelete,
}: {
   draft: Draft;
   activity: ActivityType | undefined;
   onDelete: (draft: Draft) => void;
}) {
   const presentation = activity ? presentActivity(activity) : null;
   const title = draft.title?.trim() || presentation?.shortName || "Atividade sem nome";
   const continuePath = `/solicitar?rascunho=${encodeURIComponent(draft.id)}`;
   return (
      <article className="overflow-hidden rounded-xl border border-dashed border-border bg-card">
         <Link
            to={continuePath}
            className="flex items-start gap-3 p-4 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:bg-surface"
         >
            <span className="min-w-0 flex-1">
               <StatusBadge status={STATUS.rascunho} className="px-2 py-0.5 text-[11px]" />
               <span className="mt-1.5 block wrap-break-word text-[15px] font-semibold leading-snug text-foreground">{title}</span>
               <span className="mt-0.5 block text-xs text-muted-foreground">
                  Não enviado · salvo neste dispositivo em {formatTimestamp(draft.updatedAt)}
               </span>
            </span>
            <span className="mt-1 text-sm font-medium text-primary">Continuar</span>
            <ChevronRight className="mt-1 size-5 shrink-0 text-primary" aria-hidden />
         </Link>
         <div className="border-t border-border px-2 py-1">
            <Button
               type="button"
               variant="ghost"
               size="sm"
               className="h-11 gap-2 text-destructive hover:bg-destructive-soft hover:text-destructive"
               onClick={() => onDelete(draft)}
            >
               <Trash2 className="size-4" aria-hidden /> Excluir rascunho
               <span className="sr-only"> {title}</span>
            </Button>
         </div>
      </article>
   );
}
