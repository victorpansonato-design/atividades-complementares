import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, Save, Send } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { useCreateRequest, useSaveDraft } from "../../api/mutations";
import { useBudgets, useCatalog, useDraft, useStudentContext, useSummary } from "../../api/queries";
import type { BudgetSnapshot, CourseSummary } from "../../types/budget.schema";
import type { Catalog } from "../../types/catalog.schema";
import { isGatewayError } from "../../types/gateway";
import type { ActivityRequest, Draft } from "../../types/request.schema";
import type { StudentContext } from "../../types/student.schema";
import { GATEWAY_ERROR } from "../../content/texts";
import { findBudget, resolveUnitRule, certificateUsage } from "../../rules/budget";
import { formatMinutes } from "../../rules/duration";
import { evaluateActivity } from "../../rules/limits";
import { useAttachmentStorage } from "../../hooks/use-attachment-storage";
import { LoadError, PageSkeleton } from "../common/query-states";
import { HelpSheet } from "../help/help-items";
import { ErrorSummary } from "./error-summary";
import {
   EMPTY_FORM,
   STEP_FIELDS,
   buildFormSchema,
   deriveState,
   fromDraftValues,
   toDraftValues,
   toSubmitInput,
   type FormContext,
   type RequestFormValues,
   type WizardStep,
} from "./form-model";
import { StepActivity } from "./step-activity";
import { StepDetails } from "./step-details";
import { StepReview } from "./step-review";
import { SubmitSuccess } from "./submit-success";
import { UnsavedChangesGuard } from "./unsaved-changes-guard";
import { ActionBar, WizardStepper } from "./wizard-chrome";

function newKey(): string {
   return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function readStep(value: string | null): WizardStep {
   return value === "2" ? 2 : value === "3" ? 3 : 1;
}

const STEP_TITLES: Record<WizardStep, string> = {
   1: "Etapa 1 de 3: escolha a atividade",
   2: "Etapa 2 de 3: informações e comprovantes",
   3: "Etapa 3 de 3: revisão",
};

/** Carrega dados e o rascunho (se houver) antes de montar o formulário. */
export function RequestWizard() {
   const [params] = useSearchParams();
   const draftParam = params.get("rascunho");
   const studentQ = useStudentContext();
   const catalogQ = useCatalog();
   const budgetsQ = useBudgets();
   const summaryQ = useSummary();
   const draftQ = useDraft(draftParam);

   const loading =
      studentQ.isLoading || catalogQ.isLoading || budgetsQ.isLoading || summaryQ.isLoading || (!!draftParam && draftQ.isLoading);
   if (loading) return <PageSkeleton rows={4} />;
   if (!studentQ.data || !catalogQ.data || !budgetsQ.data || !summaryQ.data) {
      return (
         <LoadError
            title="Não foi possível carregar o formulário."
            onRetry={() => {
               void studentQ.refetch();
               void catalogQ.refetch();
               void budgetsQ.refetch();
               void summaryQ.refetch();
            }}
         />
      );
   }
   return (
      <WizardForm
         key={draftParam ?? "novo"}
         student={studentQ.data}
         catalog={catalogQ.data}
         budgets={budgetsQ.data}
         summary={summaryQ.data}
         draft={draftQ.data ?? null}
         draftMissing={!!draftParam && draftQ.isError}
      />
   );
}

interface WizardFormProps {
   student: StudentContext;
   catalog: Catalog;
   budgets: BudgetSnapshot;
   summary: CourseSummary;
   draft: Draft | null;
   draftMissing: boolean;
}

function WizardForm({ student, catalog, budgets, summary, draft, draftMissing }: WizardFormProps) {
   const [params, setParams] = useSearchParams();
   const step = readStep(params.get("etapa"));
   const storage = useAttachmentStorage();
   const createRequest = useCreateRequest();
   const saveDraft = useSaveDraft();

   const ctx = useMemo<FormContext>(
      () => ({ mode: "create", student, catalog, budgets, courseComplete: summary.isComplete, self: null }),
      [student, catalog, budgets, summary.isComplete],
   );
   const ctxRef = useRef(ctx);
   useEffect(() => {
      ctxRef.current = ctx;
   }, [ctx]);

   // O schema depende do contexto atual (saldo, limites, perfil); o resolver lê a versão mais recente.
   const resolver = useCallback<Resolver<RequestFormValues>>(
      (values, context, options) => (zodResolver(buildFormSchema(ctxRef.current)) as Resolver<RequestFormValues>)(values, context, options),
      [],
   );
   const form = useForm<RequestFormValues>({
      defaultValues: draft ? fromDraftValues(draft.values) : EMPTY_FORM,
      resolver,
      mode: "onSubmit",
      reValidateMode: "onChange",
   });
   const { watch, trigger, getValues, setValue, reset, clearErrors, formState } = form;

   const localFiles = useRef(new Map<string, File>()).current;
   const idempotencyKey = useRef(newKey());
   const [draftId, setDraftId] = useState<string | null>(draft?.id ?? null);
   const [submitted, setSubmitted] = useState<ActivityRequest | null>(null);
   const [showSummary, setShowSummary] = useState(false);
   const [uploading, setUploading] = useState(false);
   const [activityChanged, setActivityChanged] = useState(false);
   const [announcement, setAnnouncement] = useState("");
   const [submitError, setSubmitError] = useState<{ message: string; maximumMinutes?: number } | null>(null);
   const headingRef = useRef<HTMLHeadingElement>(null);
   const summaryRef = useRef<HTMLDivElement>(null);
   const pendingFocus = useRef<string | null>(null);
   const firstRender = useRef(true);

   const values = watch();
   const derived = deriveState(values, ctx);
   const activityId = values.activityLocalId;

   const availability = useMemo(
      () =>
         catalog.activities.map(activity =>
            evaluateActivity({
               activity,
               budget: findBudget(budgets.items, activity),
               student,
               catalog,
               courseComplete: summary.isComplete,
            }),
         ),
      [catalog, budgets, student, summary.isComplete],
   );

   // Rascunho recarregado: bytes podem não existir mais neste dispositivo → pedir reanexação.
   useEffect(() => {
      if (!draft) return;
      let cancelled = false;
      void (async () => {
         const current = getValues("attachments");
         const checked = await Promise.all(
            current.map(async a => (a.state === "ready" && !(await storage.exists(a.id)) ? { ...a, state: "missing" as const } : a)),
         );
         if (!cancelled && checked.some((a, i) => a.state !== current[i]!.state)) setValue("attachments", checked);
      })();
      return () => {
         cancelled = true;
      };
   }, [draft, getValues, setValue, storage]);

   // Etapa sem atividade escolhida (ex.: recarregar no passo 2) volta ao início.
   useEffect(() => {
      if (step > 1 && !activityId && !submitted) {
         setParams(
            prev => {
               const next = new URLSearchParams(prev);
               next.delete("etapa");
               return next;
            },
            { replace: true },
         );
      }
   }, [step, activityId, submitted, setParams]);

   // Gerenciamento de foco e anúncio ao trocar de etapa.
   useEffect(() => {
      if (firstRender.current) {
         firstRender.current = false;
         return;
      }
      setAnnouncement(STEP_TITLES[step]);
      const target = pendingFocus.current ? document.getElementById(pendingFocus.current) : null;
      pendingFocus.current = null;
      if (target) {
         target.focus();
         target.scrollIntoView({ block: "center" });
      } else {
         headingRef.current?.focus();
      }
   }, [step]);

   const goTo = useCallback(
      (next: WizardStep, focusId?: string) => {
         pendingFocus.current = focusId ?? null;
         setShowSummary(false);
         setParams(prev => {
            const p = new URLSearchParams(prev);
            if (next === 1) p.delete("etapa");
            else p.set("etapa", String(next));
            return p;
         });
      },
      [setParams],
   );

   function handleActivityChange(localId: string) {
      const previous = getValues("activityLocalId");
      setValue("activityLocalId", localId, { shouldDirty: true });
      clearErrors(["activityLocalId", "modeId"]);
      setSubmitError(null);
      if (!previous || previous === localId) return;
      // Troca de tipo: reseta só o incompatível e avisa.
      const next = catalog.activities.find(a => a.localId === localId);
      setValue("modeId", null);
      setValue("requestedMode", "auto");
      const nextRule = next ? resolveUnitRule(next, null) : null;
      if (next?.unitRule?.kind !== "mode_dependent" && certificateUsage(nextRule) === "hidden") {
         setValue("certificate", { hours: "", minutes: "" });
      }
      const attachments = getValues("attachments");
      if (attachments.length)
         setValue(
            "attachments",
            attachments.map(a => ({ ...a, requirementKeys: [] })),
         );
      const v = getValues();
      setActivityChanged(!!(v.title || v.startDate || v.requested.hours || v.requested.minutes || attachments.length));
   }

   // Com o resumo de erros aberto, revalida a cada alteração: o erro some assim que é resolvido.
   const valuesKey = JSON.stringify(values);
   useEffect(() => {
      if (showSummary) void trigger([...STEP_FIELDS[step]]);
   }, [valuesKey, showSummary, step, trigger]);

   async function continueTo(next: WizardStep) {
      if (uploading) {
         setAnnouncement("Aguarde: um arquivo ainda está sendo preparado.");
         return;
      }
      const ok = await trigger([...STEP_FIELDS[step]]);
      if (!ok) {
         setShowSummary(true);
         setAnnouncement("Há itens para corrigir antes de continuar.");
         requestAnimationFrame(() => summaryRef.current?.focus());
         return;
      }
      goTo(next);
   }

   async function persistDraft(): Promise<void> {
      const v = getValues();
      const saved = await saveDraft.mutateAsync({
         id: draftId,
         activityLocalId: v.activityLocalId || null,
         title: v.title.trim() || null,
         values: toDraftValues(v),
      });
      setDraftId(saved.id);
      reset(v, { keepErrors: true });
      setAnnouncement("Rascunho salvo neste dispositivo.");
      toast.success("Rascunho salvo neste dispositivo.", { description: "Rascunhos não reservam horas. Continue pelo acompanhamento." });
   }

   async function handleSaveDraft() {
      try {
         await persistDraft();
      } catch {
         toast.error("Não foi possível salvar o rascunho. Tente novamente.");
         throw new Error("draft");
      }
   }

   async function handleSubmit() {
      if (createRequest.isPending) return; // duplo clique
      setSubmitError(null);
      const ok = await trigger();
      if (!ok) {
         const errors = form.formState.errors;
         const firstStep = ([1, 2, 3] as const).find(s => STEP_FIELDS[s].some(f => errors[f]));
         if (firstStep && firstStep !== 3) goTo(firstStep);
         setShowSummary(true);
         requestAnimationFrame(() => summaryRef.current?.focus());
         return;
      }
      setAnnouncement("Enviando solicitação…");
      createRequest.mutate(
         {
            input: toSubmitInput(getValues(), ctx, draftId),
            options: { idempotencyKey: idempotencyKey.current, budgetRevision: budgets.revision },
         },
         {
            onSuccess: request => {
               idempotencyKey.current = newKey();
               reset(EMPTY_FORM);
               localFiles.clear();
               setSubmitted(request);
               setAnnouncement(`Solicitação enviada. Protocolo ${request.protocol ?? ""}. Situação: em análise.`);
            },
            onError: error => {
               const code = isGatewayError(error) ? error.code : "falha_temporaria";
               const maximumMinutes =
                  isGatewayError(error) && typeof error.details.maximumMinutes === "number" ? error.details.maximumMinutes : undefined;
               const message =
                  GATEWAY_ERROR[code] + (maximumMinutes != null ? ` Agora você pode solicitar até ${formatMinutes(maximumMinutes)}.` : "");
               setSubmitError({ message, maximumMinutes });
               setAnnouncement(`Erro no envio: ${message}`);
            },
         },
      );
   }

   function startNew() {
      setSubmitted(null);
      setDraftId(null);
      setActivityChanged(false);
      setParams(new URLSearchParams());
      requestAnimationFrame(() => headingRef.current?.focus());
   }

   const dirty = formState.isDirty && !submitted;

   if (submitted) {
      return (
         <div className="space-y-6">
            <p role="status" className="sr-only">
               {announcement}
            </p>
            <SubmitSuccess request={submitted} slaBusinessDays={student.policies.analysisSlaBusinessDays} onNew={startNew} />
         </div>
      );
   }

   const stepFields = STEP_FIELDS[step];
   const canSaveDraft = catalog.submissionAvailable && !!activityId;

   return (
      <FormProvider {...form}>
         <form
            noValidate
            onSubmit={e => {
               e.preventDefault();
               if (step < 3) void continueTo((step + 1) as WizardStep);
               else void handleSubmit();
            }}
            className="space-y-6"
         >
            <PageHeader
               className="pb-4 [&>div:last-child]:mt-3 [&_h1]:text-[22px] sm:[&_h1]:text-[28px]"
               title="Solicitar horas"
               actions={<HelpSheet topic={step === 1 ? "atividade" : step === 2 ? "informacoes" : "revisao"} />}
            />

            <WizardStepper current={step} />
            <p role="status" aria-live="polite" className="sr-only">
               {announcement}
            </p>

            {draftMissing ? (
               <Callout tone="warning" icon={AlertCircle} title="Rascunho não encontrado">
                  Ele pode ter sido excluído ou apagado ao restaurar a demonstração. Você pode começar um novo pedido.
               </Callout>
            ) : null}
            {draft && step === 1 ? (
               <Callout tone="info" title="Continuando um rascunho">
                  Rascunhos ficam salvos neste dispositivo e não reservam horas até o envio.
               </Callout>
            ) : null}

            {showSummary ? <ErrorSummary ref={summaryRef} errors={formState.errors} fields={stepFields} /> : null}

            {step === 1 ? (
               <StepActivity
                  student={student}
                  catalog={catalog}
                  availability={availability}
                  onActivityChange={handleActivityChange}
                  onContinue={() => void continueTo(2)}
                  headingRef={headingRef}
               />
            ) : step === 2 ? (
               <StepDetails
                  ctx={ctx}
                  derived={derived}
                  localFiles={localFiles}
                  headingRef={headingRef}
                  activityChanged={activityChanged}
                  onChangeActivity={() => goTo(1, `ac-activity-${activityId}`)}
                  onUploadBusyChange={setUploading}
               />
            ) : (
               <StepReview
                  ctx={ctx}
                  derived={derived}
                  headingRef={headingRef}
                  onEdit={(target, focusId) => goTo(target, focusId)}
                  submitError={
                     submitError ? (
                        <Callout tone="danger" icon={AlertCircle} title="A solicitação não foi enviada">
                           <span className="block">{submitError.message}</span>
                           <span className="mt-2 flex flex-wrap gap-2">
                              {submitError.maximumMinutes != null ? (
                                 <Button
                                    type="button"
                                    variant="outline"
                                    className="h-11 bg-card"
                                    onClick={() => goTo(2, "ac-requested-hours")}
                                 >
                                    Ajustar horas
                                 </Button>
                              ) : null}
                           </span>
                        </Callout>
                     ) : null
                  }
               />
            )}

            <ActionBar
               aside={
                  canSaveDraft && step > 1 ? (
                     <Button
                        type="button"
                        variant="ghost"
                        className="h-11 gap-2 px-3"
                        disabled={saveDraft.isPending}
                        onClick={() => void handleSaveDraft().catch(() => {})}
                     >
                        <Save className="size-4" aria-hidden /> <span className="sr-only sm:not-sr-only">Salvar rascunho</span>
                     </Button>
                  ) : null
               }
            >
               {step === 1 ? (
                  <Link to="/" className={cn(buttonVariants({ variant: "outline" }), "h-11 gap-2 px-3 sm:px-4")}>
                     <ArrowLeft className="size-4" aria-hidden /> Voltar
                  </Link>
               ) : (
                  <Button
                     type="button"
                     variant="outline"
                     className="h-11 gap-2 px-3 sm:px-4"
                     onClick={() => goTo((step - 1) as WizardStep)}
                  >
                     <ArrowLeft className="size-4" aria-hidden /> Voltar
                  </Button>
               )}
               {step === 1 && !activityId ? null : step < 3 ? (
                  <Button type="submit" size="lg" className="gap-2 px-4 sm:px-6" disabled={step === 2 && uploading}>
                     {step === 2 && uploading ? (
                        <>
                           <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> Aguarde o arquivo…
                        </>
                     ) : (
                        <>
                           Continuar <ArrowRight className="size-4" aria-hidden />
                        </>
                     )}
                  </Button>
               ) : (
                  <Button
                     type="submit"
                     size="lg"
                     className="gap-2 px-4 sm:px-6"
                     disabled={createRequest.isPending}
                     aria-disabled={createRequest.isPending}
                  >
                     {createRequest.isPending ? (
                        <>
                           <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> Enviando…
                        </>
                     ) : (
                        <>
                           <Send className="size-4" aria-hidden /> {submitError ? "Tentar novamente" : "Enviar solicitação"}
                        </>
                     )}
                  </Button>
               )}
            </ActionBar>
         </form>

         <UnsavedChangesGuard when={dirty} onSaveDraft={canSaveDraft ? handleSaveDraft : undefined} saving={saveDraft.isPending} />
      </FormProvider>
   );
}
