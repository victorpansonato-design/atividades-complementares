import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CalendarClock, Loader2, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { RefId } from "@/components/ui/ref-id";
import { cn } from "@/lib/utils";
import { useReplyToCorrection } from "../../api/mutations";
import { useBudgets, useCatalog, useRequest, useStudentContext, useSummary } from "../../api/queries";
import { isGatewayError } from "../../types/gateway";
import type { ActivityRequest } from "../../types/request.schema";
import type { BudgetSnapshot, CourseSummary } from "../../types/budget.schema";
import type { Catalog } from "../../types/catalog.schema";
import type { StudentContext } from "../../types/student.schema";
import { GATEWAY_ERROR } from "../../content/texts";
import { formatIsoDate } from "../../rules/dates";
import { formatMinutes, minutesToFields } from "../../rules/duration";
import { correctionAvailability } from "../../rules/status";
import { LoadError, PageSkeleton } from "../common/query-states";
import { BackToTracking, RequestNotFound } from "../detail/request-detail-view";
import { HelpSheet } from "../help/help-items";
import { ErrorSummary } from "../request-form/error-summary";
import {
   buildFormSchema,
   deriveState,
   fromAttachments,
   STEP_FIELDS,
   toSubmitInput,
   type FormContext,
   type RequestFormValues,
} from "../request-form/form-model";
import { StepDetails } from "../request-form/step-details";
import { SubmitSuccess } from "../request-form/submit-success";
import { UnsavedChangesGuard } from "../request-form/unsaved-changes-guard";
import { ActionBar } from "../request-form/wizard-chrome";
import { RESPONSIVE_HEADER } from "../tracking/tracking-view";

function newKey(): string {
   return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

/** Correção de pendência: mesmo protocolo, versões preservadas, sem reserva dupla. */
export function CorrectionView({ requestId }: { requestId: string }) {
   const studentQ = useStudentContext();
   const requestQ = useRequest(requestId);
   const catalogQ = useCatalog();
   const budgetsQ = useBudgets();
   const summaryQ = useSummary();
   const [completed, setCompleted] = useState<ActivityRequest | null>(null);

   if (completed) {
      return (
         <SubmitSuccess
            request={completed}
            slaBusinessDays={studentQ.data?.policies.analysisSlaBusinessDays ?? null}
            title="Correção enviada"
            description="O pedido voltou para análise com o mesmo protocolo. A versão anterior e os documentos enviados antes continuam no histórico."
         />
      );
   }
   if (studentQ.isLoading || requestQ.isLoading || catalogQ.isLoading || budgetsQ.isLoading || summaryQ.isLoading)
      return <PageSkeleton rows={4} />;
   if (requestQ.isError && isGatewayError(requestQ.error) && requestQ.error.code === "nao_encontrado") return <RequestNotFound />;
   if (!studentQ.data || !requestQ.data || !catalogQ.data || !budgetsQ.data || !summaryQ.data) {
      return <LoadError title="Não foi possível carregar o pedido." onRetry={() => requestQ.refetch()} />;
   }

   const request = requestQ.data;
   const availability = correctionAvailability(request, studentQ.data);
   if (!availability.allowed) {
      return (
         <div className="space-y-6">
            <BackToTracking />
            <EmptyState
               icon={CalendarClock}
               title={
                  availability.reason === "deadline_expired"
                     ? "O prazo para responder terminou."
                     : "Este pedido não está aguardando correção."
               }
               hint={
                  availability.reason === "deadline_expired"
                     ? `O prazo terminou em ${formatIsoDate(availability.deadline)}. Procure a coordenação do curso pelos canais oficiais.`
                     : "Pedidos enviados só podem ser alterados quando a coordenação pede correção."
               }
               actions={
                  <Link to={`/pedidos/${encodeURIComponent(request.id)}`} className={cn(buttonVariants({ variant: "outline" }), "h-11")}>
                     Ver detalhes do pedido
                  </Link>
               }
            />
         </div>
      );
   }

   return (
      <CorrectionForm
         request={request}
         student={studentQ.data}
         catalog={catalogQ.data}
         budgets={budgetsQ.data}
         summary={summaryQ.data}
         deadline={availability.deadline}
         onDone={setCompleted}
      />
   );
}

interface CorrectionFormProps {
   request: ActivityRequest;
   student: StudentContext;
   catalog: Catalog;
   budgets: BudgetSnapshot;
   summary: CourseSummary;
   deadline: string | null;
   onDone: (request: ActivityRequest) => void;
}

function CorrectionForm({ request, student, catalog, budgets, summary, deadline, onDone }: CorrectionFormProps) {
   const reply = useReplyToCorrection(request.id);
   const ctx = useMemo<FormContext>(
      () => ({
         mode: "correction",
         student,
         catalog,
         budgets,
         courseComplete: summary.isComplete,
         // A reserva atual do próprio pedido sai do somatório: o substituto não reserva duas vezes.
         self: { reservedMinutes: request.reservedMinutes, periodId: request.academicPeriodId },
      }),
      [student, catalog, budgets, summary.isComplete, request.reservedMinutes, request.academicPeriodId],
   );
   const ctxRef = useRef(ctx);
   useEffect(() => {
      ctxRef.current = ctx;
   }, [ctx]);
   const resolver = useCallback<Resolver<RequestFormValues>>(
      (values, context, options) => (zodResolver(buildFormSchema(ctxRef.current)) as Resolver<RequestFormValues>)(values, context, options),
      [],
   );
   const form = useForm<RequestFormValues>({
      resolver,
      defaultValues: {
         activityLocalId: request.activityLocalId,
         modeId: request.modeId,
         title: request.title,
         organizer: request.organizer ?? "",
         singleDay: request.startDate === request.endDate,
         startDate: request.startDate,
         endDate: request.endDate,
         academicPeriodId: request.academicPeriodId,
         periodSuggested: false,
         certificate: minutesToFields(request.certificateMinutes),
         requested: minutesToFields(request.requestedMinutes),
         requestedMode: "manual",
         details: request.details ?? "",
         attachments: fromAttachments(request.attachments),
         declaration: false,
         studentResponse: "",
      },
   });
   const { register, trigger, getValues, watch, formState } = form;
   const values = watch();
   const derived = deriveState(values, ctx);
   const localFiles = useRef(new Map<string, File>()).current;
   const idempotencyKey = useRef(newKey());
   const headingRef = useRef<HTMLHeadingElement>(null);
   const summaryRef = useRef<HTMLDivElement>(null);
   const [showSummary, setShowSummary] = useState(false);
   const [uploading, setUploading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [announcement, setAnnouncement] = useState("");
   const fields = [...STEP_FIELDS[2], "declaration"] as const;

   async function submit() {
      if (reply.isPending || uploading) return;
      setError(null);
      const ok = await trigger();
      if (!ok) {
         setShowSummary(true);
         requestAnimationFrame(() => summaryRef.current?.focus());
         return;
      }
      setShowSummary(false);
      setAnnouncement("Enviando correção…");
      const input = toSubmitInput(getValues(), ctx, null);
      reply.mutate(
         {
            input: { ...input, studentResponse: getValues("studentResponse").trim() || null },
            options: { idempotencyKey: idempotencyKey.current, budgetRevision: budgets.revision },
         },
         {
            onSuccess: updated => {
               form.reset(getValues());
               onDone(updated);
            },
            onError: err => {
               const code = isGatewayError(err) ? err.code : "falha_temporaria";
               const max =
                  isGatewayError(err) && typeof err.details.maximumMinutes === "number"
                     ? ` Agora você pode solicitar até ${formatMinutes(err.details.maximumMinutes)}.`
                     : "";
               setError(GATEWAY_ERROR[code] + max);
               setAnnouncement(`Erro no envio: ${GATEWAY_ERROR[code]}`);
            },
         },
      );
   }

   return (
      <FormProvider {...form}>
         <form
            noValidate
            className="space-y-6"
            onSubmit={e => {
               e.preventDefault();
               void submit();
            }}
         >
            <BackToTracking />
            <PageHeader
               className={RESPONSIVE_HEADER}
               eyebrow={<span>Correção do protocolo {request.protocol ? <RefId value={request.protocol} /> : null}</span>}
               title="Corrigir e reenviar"
               description="Atualize o que a coordenação pediu. O protocolo continua o mesmo e a versão anterior fica guardada no histórico."
               actions={<HelpSheet topic="correcao" />}
            />
            <p role="status" aria-live="polite" className="sr-only">
               {announcement}
            </p>
            {deadline ? (
               <Callout tone="info" icon={CalendarClock}>
                  Responda até {formatIsoDate(deadline)}
                  {request.deadlineIsMock ? " (prazo fictício da demonstração)" : ""}. As horas deste pedido continuam reservadas uma única
                  vez.
               </Callout>
            ) : null}
            {showSummary ? <ErrorSummary ref={summaryRef} errors={formState.errors} fields={fields} /> : null}
            {error ? (
               <Callout tone="danger" icon={AlertCircle} title="A correção não foi enviada">
                  {error}
               </Callout>
            ) : null}

            <StepDetails
               ctx={ctx}
               derived={derived}
               localFiles={localFiles}
               headingRef={headingRef}
               activityChanged={false}
               correction={{ reason: request.correctionReason }}
               onUploadBusyChange={setUploading}
            />

            <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
               <label htmlFor="ac-declaration" className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
                  <input
                     id="ac-declaration"
                     type="checkbox"
                     className="mt-0.5 size-5 shrink-0 accent-primary"
                     aria-invalid={!!formState.errors.declaration}
                     aria-describedby={formState.errors.declaration ? "ac-declaration-error" : undefined}
                     {...register("declaration")}
                  />
                  <span className="font-medium text-foreground">
                     Confirmo que as informações e os documentos apresentados são verdadeiros.
                  </span>
               </label>
               {formState.errors.declaration ? (
                  <p id="ac-declaration-error" className="mt-2 text-sm text-destructive">
                     {formState.errors.declaration.message}
                  </p>
               ) : null}
            </div>

            <ActionBar>
               <Link to={`/pedidos/${encodeURIComponent(request.id)}`} className={cn(buttonVariants({ variant: "outline" }), "h-11")}>
                  Cancelar
               </Link>
               <Button type="submit" size="lg" className="gap-2 px-6" disabled={reply.isPending || uploading}>
                  {reply.isPending ? (
                     <>
                        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> Enviando…
                     </>
                  ) : (
                     <>
                        <Send className="size-4" aria-hidden /> {error ? "Tentar novamente" : "Reenviar para análise"}
                     </>
                  )}
               </Button>
            </ActionBar>
         </form>
         <UnsavedChangesGuard when={formState.isDirty && !reply.isSuccess} />
      </FormProvider>
   );
}
