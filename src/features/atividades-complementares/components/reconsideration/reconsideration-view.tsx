import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CalendarClock, Info, Loader2, RotateCcw, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldLabel } from "@/components/ui/field-label";
import { PageHeader } from "@/components/ui/page-header";
import { RefId } from "@/components/ui/ref-id";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useRequestReconsideration } from "../../api/mutations";
import { useBudgets, useCatalog, useRequest, useStudentContext } from "../../api/queries";
import { isGatewayError } from "../../types/gateway";
import type { ActivityRequest } from "../../types/request.schema";
import type { StudentContext } from "../../types/student.schema";
import { GATEWAY_ERROR } from "../../content/texts";
import { formatIsoDate } from "../../rules/dates";
import { formatMinutes } from "../../rules/duration";
import { findBudget } from "../../rules/budget";
import { computeRequestLimits } from "../../rules/limits";
import { FACTOR_LABEL } from "../../content/texts";
import { reconsiderationAvailability } from "../../rules/status";
import { LoadError, PageSkeleton } from "../common/query-states";
import { BackToTracking, RequestNotFound } from "../detail/request-detail-view";
import { HelpSheet } from "../help/help-items";
import { AttachmentsField } from "../request-form/attachments-field";
import { FormAttachmentSchema, toAttachments } from "../request-form/form-model";
import { SubmitSuccess } from "../request-form/submit-success";
import { UnsavedChangesGuard } from "../request-form/unsaved-changes-guard";
import { ActionBar } from "../request-form/wizard-chrome";
import { RESPONSIVE_HEADER } from "../tracking/tracking-view";

const JUSTIFICATION_LIMIT = 6000;

function buildSchema(documentsRequired: boolean) {
   return z.object({
      justification: z
         .string()
         .trim()
         .min(20, "Explique o motivo do pedido de reconsideração (pelo menos 20 caracteres).")
         .max(JUSTIFICATION_LIMIT, `Use no máximo ${JUSTIFICATION_LIMIT.toLocaleString("pt-BR")} caracteres.`),
      attachments: z
         .array(FormAttachmentSchema)
         .refine(list => !documentsRequired || list.some(a => a.state === "ready"), "Anexe ao menos um documento complementar."),
      declaration: z.boolean().refine(v => v, "Confirme a declaração para enviar."),
   });
}
type ReconsiderationValues = z.infer<ReturnType<typeof buildSchema>>;

function newKey(): string {
   return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

/** Reconsideração vinculada ao pedido recusado: não é nova atividade; reserva uma vez. */
export function ReconsiderationView({ requestId }: { requestId: string }) {
   const studentQ = useStudentContext();
   const requestQ = useRequest(requestId);
   const [completed, setCompleted] = useState<ActivityRequest | null>(null);

   if (completed) {
      return (
         <SubmitSuccess
            request={completed}
            slaBusinessDays={studentQ.data?.policies.analysisSlaBusinessDays ?? null}
            title="Pedido de reconsideração enviado"
            description="A reconsideração está vinculada ao pedido original. As horas ficam reservadas uma única vez até a nova decisão."
         />
      );
   }
   if (studentQ.isLoading || requestQ.isLoading) return <PageSkeleton />;
   if (requestQ.isError && isGatewayError(requestQ.error) && requestQ.error.code === "nao_encontrado") return <RequestNotFound />;
   if (!studentQ.data || !requestQ.data)
      return <LoadError title="Não foi possível carregar o pedido." onRetry={() => requestQ.refetch()} />;

   const request = requestQ.data;
   const availability = reconsiderationAvailability(request, studentQ.data);
   if (!availability.allowed) {
      const messages: Record<typeof availability.reason, string> = {
         not_rejected: "Só é possível pedir reconsideração de pedidos não aprovados.",
         institutional: "Registros institucionais não têm pedido de reconsideração por aqui.",
         active_attempt: "Já existe um pedido de reconsideração em análise para este protocolo.",
         attempts_exhausted: "A reconsideração deste pedido já foi analisada.",
         deadline_expired: `O prazo para pedir reconsideração terminou em ${formatIsoDate(availability.deadline)}.`,
         deadline_unknown: "O prazo para reconsideração não foi informado. Procure a coordenação do curso pelos canais oficiais.",
      };
      return (
         <div className="space-y-6">
            <BackToTracking />
            <EmptyState
               icon={CalendarClock}
               title="Reconsideração indisponível"
               hint={messages[availability.reason]}
               actions={
                  <Link to={`/pedidos/${encodeURIComponent(request.id)}`} className={cn(buttonVariants({ variant: "outline" }), "h-11")}>
                     Ver detalhes do pedido
                  </Link>
               }
            />
         </div>
      );
   }
   return <ReconsiderationForm request={request} student={studentQ.data} deadline={availability.deadline} onDone={setCompleted} />;
}

function ReconsiderationForm({
   request,
   student,
   deadline,
   onDone,
}: {
   request: ActivityRequest;
   student: StudentContext;
   deadline: string;
   onDone: (r: ActivityRequest) => void;
}) {
   const documentsRequired = student.policies.reconsiderationDocuments === "required";
   const mutation = useRequestReconsideration(request.id);
   const form = useForm<ReconsiderationValues>({
      resolver: zodResolver(buildSchema(documentsRequired)),
      defaultValues: { justification: "", attachments: [], declaration: false },
   });
   const { register, control, handleSubmit, formState, watch, reset } = form;
   const localFiles = useRef(new Map<string, File>()).current;
   const idempotencyKey = useRef(newKey());
   const [error, setError] = useState<string | null>(null);
   const justification = watch("justification");
   const errors = formState.errors;
   const catalog = useCatalog().data;
   const budgets = useBudgets().data;
   const activity = catalog?.activities.find(a => a.localId === request.activityLocalId && a.catalogVersion === request.catalogVersion);
   // Máximo aplicável hoje a este pedido (o próprio pedido recusado não reserva nada).
   const limits =
      activity && budgets
         ? computeRequestLimits({
              activity,
              modeId: request.modeId,
              budget: findBudget(budgets.items, activity),
              periodId: request.academicPeriodId,
              certificateMinutes: request.certificateMinutes,
              self: null,
              policies: student.policies,
           })
         : null;
   const max = limits?.maximum.maximumMinutes ?? null;
   const exceeds = max != null && request.requestedMinutes != null && request.requestedMinutes > max;

   const onSubmit = handleSubmit(
      values => {
         if (mutation.isPending) return;
         setError(null);
         mutation.mutate(
            {
               input: {
                  justification: values.justification,
                  attachments: toAttachments(values.attachments),
                  declarationAccepted: values.declaration,
               },
               options: { idempotencyKey: idempotencyKey.current },
            },
            {
               onSuccess: updated => {
                  reset(values);
                  onDone(updated);
               },
               onError: err => setError(GATEWAY_ERROR[isGatewayError(err) ? err.code : "falha_temporaria"]),
            },
         );
      },
      () => requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus()),
   );

   return (
      <>
         <form noValidate onSubmit={onSubmit} className="space-y-6">
            <BackToTracking />
            <PageHeader
               className={RESPONSIVE_HEADER}
               eyebrow={<span>Reconsideração do protocolo {request.protocol ? <RefId value={request.protocol} /> : null}</span>}
               title="Pedir reconsideração"
               description="Explique por que a decisão deve ser revista. O pedido fica vinculado ao original e não conta como nova atividade."
               actions={<HelpSheet topic="reconsideracao" />}
            />

            <Callout tone="danger" icon={XCircle} title={`Decisão sobre “${request.title}”`}>
               {request.decisionReason ?? "Pedido não aprovado."}
            </Callout>
            <Callout tone="info" icon={Info}>
               Envie até {formatIsoDate(deadline)}
               {request.deadlineIsMock ? " (prazo fictício da demonstração)" : ""}. Enquanto a reconsideração estiver em análise, as{" "}
               {formatMinutes(request.requestedMinutes ?? 0)} solicitadas ficam reservadas uma única vez no saldo do tipo. O modelo
               definitivo de protocolo da reconsideração ainda será validado pela instituição.
            </Callout>

            {exceeds && limits?.maximum.binding ? (
               <Callout tone="warning" icon={AlertCircle} title="As horas pedidas superam o limite aplicável">
                  Este pedido solicitou {formatMinutes(request.requestedMinutes!)}, mas hoje o máximo aplicável é {formatMinutes(max!)} (
                  {FACTOR_LABEL[limits.maximum.binding.kind].toLowerCase()}). Se a reconsideração for aceita, a coordenação atribui no
                  máximo o permitido pelo regulamento. Nesta demonstração, a reserva usa o valor originalmente solicitado (regra provisória
                  a confirmar com o TI).
               </Callout>
            ) : null}

            {error ? (
               <Callout tone="danger" icon={AlertCircle} title="A reconsideração não foi enviada">
                  {error}
               </Callout>
            ) : null}

            <section className="space-y-2 rounded-xl border border-border bg-card p-4 sm:p-5">
               <FieldLabel htmlFor="ac-justification" required>
                  Justificativa
               </FieldLabel>
               <Textarea
                  id="ac-justification"
                  rows={6}
                  className="min-h-32 text-base md:text-sm"
                  aria-invalid={!!errors.justification}
                  aria-describedby={cn("ac-justification-count", errors.justification && "ac-justification-error")}
                  {...register("justification")}
               />
               <p id="ac-justification-count" className="text-xs text-muted-foreground tabular">
                  {justification.length.toLocaleString("pt-BR")} de {JUSTIFICATION_LIMIT.toLocaleString("pt-BR")} caracteres.
               </p>
               {errors.justification ? (
                  <p id="ac-justification-error" className="text-sm text-destructive">
                     {errors.justification.message}
                  </p>
               ) : null}
            </section>

            <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
               <Controller
                  control={control}
                  name="attachments"
                  render={({ field }) => (
                     <AttachmentsField
                        title="Documentos complementares"
                        optional={!documentsRequired}
                        requirements={[]}
                        value={field.value}
                        onChange={field.onChange}
                        policies={student.policies}
                        institutionalRecords={student.institutionalRecords}
                        localFiles={localFiles}
                        error={errors.attachments?.message}
                     />
                  )}
               />
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
               <label htmlFor="ac-declaration" className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
                  <input
                     id="ac-declaration"
                     type="checkbox"
                     className="mt-0.5 size-5 shrink-0 accent-primary"
                     aria-invalid={!!errors.declaration}
                     aria-describedby={errors.declaration ? "ac-declaration-error" : undefined}
                     {...register("declaration")}
                  />
                  <span className="font-medium text-foreground">
                     Confirmo que as informações e os documentos apresentados são verdadeiros.
                  </span>
               </label>
               {errors.declaration ? (
                  <p id="ac-declaration-error" className="mt-2 text-sm text-destructive">
                     {errors.declaration.message}
                  </p>
               ) : null}
            </div>

            <ActionBar>
               <Link to={`/pedidos/${encodeURIComponent(request.id)}`} className={cn(buttonVariants({ variant: "outline" }), "h-11")}>
                  Cancelar
               </Link>
               <Button type="submit" size="lg" className="gap-2 px-6" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                     <>
                        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> Enviando…
                     </>
                  ) : (
                     <>
                        <RotateCcw className="size-4" aria-hidden /> {error ? "Tentar novamente" : "Solicitar reconsideração"}
                     </>
                  )}
               </Button>
            </ActionBar>
         </form>
         <UnsavedChangesGuard when={formState.isDirty && !mutation.isSuccess} />
      </>
   );
}
