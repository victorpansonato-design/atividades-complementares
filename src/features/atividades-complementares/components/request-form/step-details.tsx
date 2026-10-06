import { useEffect, useState, type ReactNode } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { AlertTriangle, ChevronDown, Info, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FieldLabel } from "@/components/ui/field-label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { StudentContext } from "../../types/student.schema";
import { presentActivity } from "../../content/catalog-presentation";
import { FACTOR_LABEL } from "../../content/texts";
import { checkAdmission, checkPeriodConsistency, formatIsoDate, suggestPeriod } from "../../rules/dates";
import { LEGACY_DESCRIPTION_LIMIT } from "../../rules/description";
import { formatMinutes, minutesToFields, parseDurationFields } from "../../rules/duration";
import { AttachmentsField } from "./attachments-field";
import { DurationField } from "./duration-field";
import { suggestRequestedMinutes, type DerivedState, type FormContext, type RequestFormValues } from "./form-model";

interface StepDetailsProps {
   ctx: FormContext;
   derived: DerivedState;
   localFiles: Map<string, File>;
   headingRef: React.Ref<HTMLHeadingElement>;
   activityChanged: boolean;
   onChangeActivity?: () => void;
   /** Correção: atividade travada e campo de resposta à coordenação. */
   correction?: { reason: string | null };
   onUploadBusyChange?: (busy: boolean) => void;
}

function FieldError({ id, message }: { id: string; message?: string }) {
   if (!message) return null;
   return (
      <p id={id} className="text-sm text-destructive">
         {message}
      </p>
   );
}

/** Bloco numerado: o aluno vê a ordem e o tamanho do trabalho. */
function Block({ n, title, children, hint }: { n: number; title: string; children: ReactNode; hint?: ReactNode }) {
   return (
      <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5" aria-labelledby={`ac-block-${n}`}>
         <div className="flex items-start gap-3">
            <span
               className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary"
               aria-hidden
            >
               {n}
            </span>
            <div className="min-w-0">
               <h3 id={`ac-block-${n}`} className="font-display text-[15px] font-medium leading-7 text-foreground">
                  {title}
               </h3>
               {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
            </div>
         </div>
         {children}
      </section>
   );
}

function periodLabel(student: StudentContext, id: string): string {
   return student.academicPeriods.find(p => p.id === id)?.label ?? id;
}

export function StepDetails({
   ctx,
   derived,
   localFiles,
   headingRef,
   activityChanged,
   onChangeActivity,
   correction,
   onUploadBusyChange,
}: StepDetailsProps) {
   const { register, control, watch, setValue, getValues, formState } = useFormContext<RequestFormValues>();
   const errors = formState.errors;
   const { student } = ctx;
   const { activity, limits, requirements } = derived;
   const [startDate, endDate, periodId, periodSuggested, singleDay, requestedMode, modeId] = watch([
      "startDate",
      "endDate",
      "academicPeriodId",
      "periodSuggested",
      "singleDay",
      "requestedMode",
      "modeId",
   ]);
   const [editPeriod, setEditPeriod] = useState(false);
   const [detailsOpen, setDetailsOpen] = useState(() => getValues("details").length > 0);

   // Um único dia: a data final acompanha a inicial.
   useEffect(() => {
      if (singleDay && endDate !== startDate) setValue("endDate", startDate, { shouldDirty: true });
   }, [singleDay, startDate, endDate, setValue]);

   // Período sugerido pelas datas quando o calendário permite; o aluno pode alterar.
   const suggestion = suggestPeriod(student, startDate, endDate);
   const suggestedId = suggestion.kind === "suggested" ? suggestion.periodId : null;
   useEffect(() => {
      if (!suggestedId) return;
      if (!periodId || periodSuggested) {
         if (periodId !== suggestedId) setValue("academicPeriodId", suggestedId, { shouldDirty: true });
         if (!periodSuggested) setValue("periodSuggested", true);
      }
   }, [suggestedId, periodId, periodSuggested, setValue]);

   // Horas automáticas: o sistema preenche o máximo que cabe; o aluno pode pedir menos.
   const suggestedMinutes = suggestRequestedMinutes(limits, derived.certificateMinutes);
   useEffect(() => {
      if (requestedMode !== "auto" || suggestedMinutes == null) return;
      const current = parseDurationFields(getValues("requested"));
      if (!current.ok || current.minutes !== suggestedMinutes) {
         setValue("requested", minutesToFields(suggestedMinutes), { shouldDirty: true, shouldValidate: formState.isSubmitted });
      }
   }, [requestedMode, suggestedMinutes, getValues, setValue, formState.isSubmitted]);

   if (!activity) return null;
   const presentation = presentActivity(activity);
   const admission = checkAdmission(activity, student.admissionDate, startDate, endDate);
   const consistency = checkPeriodConsistency(student, periodId, startDate, endDate);
   const descriptionLength = derived.description.length;
   const remaining = LEGACY_DESCRIPTION_LIMIT - descriptionLength;
   const max = limits?.maximum.maximumMinutes ?? null;
   const binding = limits?.maximum.binding ?? null;
   const mode = activity.unitRule?.modes?.find(m => m.id === modeId);
   const showPeriodSelect =
      editPeriod ||
      !periodSuggested ||
      !periodId ||
      consistency === "mismatch" ||
      suggestion.kind !== "suggested" ||
      !!errors.academicPeriodId;
   const autoRequested = requestedMode === "auto" && suggestedMinutes != null;
   const certificate = derived.certificateMinutes;

   /** Por que o máximo é esse valor, em uma frase. */
   const limitReason =
      binding?.kind === "certificate"
         ? "É o total do comprovante."
         : binding?.kind === "type_balance"
           ? "É o saldo que resta neste tipo de atividade."
           : binding?.kind === "semester_balance"
             ? `É o que resta para este tipo no período ${periodLabel(student, periodId)}.`
             : binding?.kind === "fixed_assignment"
               ? "É a atribuição prevista para esta atividade."
               : binding?.kind === "unit_limit"
                 ? "É o limite por unidade desta atividade."
                 : "";

   return (
      <div className="space-y-4">
         <div>
            <h2 ref={headingRef} tabIndex={-1} className="font-display text-xl font-medium text-foreground outline-none">
               {correction ? "Corrija o pedido" : "Conte sobre a atividade"}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm">
               <span className="min-w-0 flex-1 font-medium text-foreground">
                  {presentation.shortName}
                  {mode ? <span className="font-normal text-muted-foreground"> · {mode.label}</span> : null}
               </span>
               {onChangeActivity ? (
                  <Button type="button" variant="ghost" size="sm" className="h-11 gap-1.5 px-2 text-primary" onClick={onChangeActivity}>
                     <Pencil className="size-3.5" aria-hidden /> Trocar
                  </Button>
               ) : null}
            </div>
         </div>

         {activityChanged ? (
            <Callout tone="info" icon={Info} title="Você trocou a atividade">
               Mantivemos nome, datas e detalhes. Confira as horas e os documentos: eles podem mudar.
            </Callout>
         ) : null}

         {correction?.reason ? (
            <Callout tone="warning" icon={AlertTriangle} title="O que a coordenação pediu">
               {correction.reason}
            </Callout>
         ) : null}

         {requirements ? (
            <Block
               n={1}
               title={correction ? "Comprovante" : "Anexe o comprovante"}
               hint="PDF, DOC ou DOCX. Com o documento em mãos, o resto fica mais fácil."
            >
               <Controller
                  control={control}
                  name="attachments"
                  render={({ field }) => (
                     <AttachmentsField
                        title={null}
                        requirements={requirements}
                        value={field.value}
                        onChange={field.onChange}
                        policies={student.policies}
                        institutionalRecords={student.institutionalRecords}
                        localFiles={localFiles}
                        error={errors.attachments?.message}
                        onBusyChange={onUploadBusyChange}
                     />
                  )}
               />
            </Block>
         ) : null}

         <Block n={2} title="Sobre a atividade">
            <div className="space-y-2">
               <FieldLabel htmlFor="ac-title" required>
                  Nome do curso, evento ou atividade
               </FieldLabel>
               <Input
                  id="ac-title"
                  className="h-11 text-base sm:text-sm"
                  autoComplete="off"
                  placeholder="Como aparece no comprovante"
                  aria-invalid={!!errors.title}
                  aria-describedby={errors.title ? "ac-title-error" : undefined}
                  {...register("title")}
               />
               <FieldError id="ac-title-error" message={errors.title?.message} />
            </div>

            <div className="space-y-2">
               <FieldLabel htmlFor="ac-organizer" required={presentation.organizer === "required"}>
                  {presentation.organizerLabel}
               </FieldLabel>
               <Input
                  id="ac-organizer"
                  className="h-11 text-base sm:text-sm"
                  autoComplete="organization"
                  aria-invalid={!!errors.organizer}
                  aria-describedby={errors.organizer ? "ac-organizer-error" : undefined}
                  {...register("organizer")}
               />
               <FieldError id="ac-organizer-error" message={errors.organizer?.message} />
            </div>

            <div className="space-y-3">
               <div className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border px-3">
                  <label htmlFor="ac-single-day" className="text-sm text-foreground">
                     Aconteceu em um único dia
                  </label>
                  <Controller
                     control={control}
                     name="singleDay"
                     render={({ field }) => <Switch id="ac-single-day" checked={field.value} onCheckedChange={field.onChange} />}
                  />
               </div>
               <div className={cn("grid gap-4", !singleDay && "sm:grid-cols-2")}>
                  <div className="space-y-2">
                     <FieldLabel htmlFor="ac-start-date" required>
                        {singleDay ? "Data da atividade" : "Data inicial"}
                     </FieldLabel>
                     <Input
                        id="ac-start-date"
                        type="date"
                        className="h-11 text-base sm:text-sm"
                        aria-invalid={!!errors.startDate}
                        aria-describedby={errors.startDate ? "ac-start-error" : undefined}
                        {...register("startDate")}
                     />
                     <FieldError id="ac-start-error" message={errors.startDate?.message} />
                  </div>
                  {!singleDay ? (
                     <div className="space-y-2">
                        <FieldLabel htmlFor="ac-end-date" required>
                           Data final
                        </FieldLabel>
                        <Input
                           id="ac-end-date"
                           type="date"
                           className="h-11 text-base sm:text-sm"
                           min={startDate || undefined}
                           aria-invalid={!!errors.endDate}
                           aria-describedby={errors.endDate ? "ac-end-error" : undefined}
                           {...register("endDate")}
                        />
                        <FieldError id="ac-end-error" message={errors.endDate?.message} />
                     </div>
                  ) : null}
               </div>
               {singleDay ? <FieldError id="ac-end-error" message={errors.endDate?.message} /> : null}
            </div>

            {admission === "before_admission" || admission === "crosses_admission" ? (
               <Callout tone="warning" icon={AlertTriangle} title="Antes do seu ingresso">
                  {admission === "before_admission"
                     ? `Você ingressou em ${formatIsoDate(student.admissionDate)}. Atividades anteriores ao ingresso normalmente não são aceitas (art. 4º, §2º) e o pedido pode ser recusado.`
                     : `Parte da atividade foi antes do seu ingresso (${formatIsoDate(student.admissionDate)}). A coordenação analisa quais horas podem contar.`}
               </Callout>
            ) : null}

            {showPeriodSelect ? (
               <div className="space-y-2">
                  <FieldLabel htmlFor="ac-period" required>
                     Ano e período da atividade
                  </FieldLabel>
                  <Controller
                     control={control}
                     name="academicPeriodId"
                     render={({ field }) => (
                        <Select
                           value={field.value || undefined}
                           onValueChange={v => {
                              field.onChange(v);
                              setValue("periodSuggested", false);
                           }}
                        >
                           <SelectTrigger
                              id="ac-period"
                              className="w-full data-[size=default]:h-11 sm:w-64"
                              aria-invalid={!!errors.academicPeriodId}
                              aria-describedby={cn("ac-period-hint", errors.academicPeriodId && "ac-period-error")}
                           >
                              <SelectValue placeholder="Selecione" />
                           </SelectTrigger>
                           <SelectContent>
                              {student.academicPeriods.map(p => (
                                 <SelectItem key={p.id} value={p.id}>
                                    {p.label}
                                 </SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                     )}
                  />
                  <p id="ac-period-hint" className="text-xs text-muted-foreground">
                     {suggestion.kind === "spans_multiple"
                        ? "As datas passam por mais de um período. Escolha em qual a atividade deve contar; a coordenação analisa a divisão."
                        : "É o período em que a atividade aconteceu, não a data de hoje."}
                     {student.periodsAreMock ? " (Calendário fictício da demonstração.)" : ""}
                  </p>
                  <FieldError id="ac-period-error" message={errors.academicPeriodId?.message} />
               </div>
            ) : (
               <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-sm">
                  <span>
                     Período da atividade: <strong className="font-semibold">{periodLabel(student, periodId)}</strong>
                     <span className="text-muted-foreground"> (pelas datas)</span>
                  </span>
                  <Button type="button" variant="ghost" size="sm" className="h-11 px-2 text-primary" onClick={() => setEditPeriod(true)}>
                     Alterar
                  </Button>
               </div>
            )}
         </Block>

         <Block n={3} title="Horas">
            {limits?.needsMode ? (
               <p className="text-sm text-muted-foreground">Escolha a opção da atividade no passo anterior para calcular as horas.</p>
            ) : (
               <>
                  {limits && limits.certificateUsage !== "hidden" ? (
                     <Controller
                        control={control}
                        name="certificate"
                        render={({ field }) => (
                           <DurationField
                              id="ac-certificate-hours"
                              legend={
                                 limits.rule?.kind === "participation_duration"
                                    ? "Tempo de participação comprovado"
                                    : "Horas que aparecem no comprovante"
                              }
                              required={limits.certificateUsage === "required"}
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              error={errors.certificate?.message}
                              description={limits.certificateUsage === "optional" ? "Se o comprovante mostrar a carga horária." : undefined}
                           />
                        )}
                     />
                  ) : null}

                  {max === 0 ? (
                     <Callout tone="warning" icon={AlertTriangle} title="Não cabem mais horas aqui">
                        {binding?.kind === "semester_balance"
                           ? `Você já usou o limite deste tipo no período ${periodLabel(student, periodId)}. Se a atividade foi em outro período, ajuste as datas.`
                           : "Este tipo de atividade não tem saldo disponível agora."}
                     </Callout>
                  ) : autoRequested ? (
                     <div className="rounded-xl border border-primary/30 bg-primary-soft/50 px-4 py-3" aria-live="polite">
                        <p className="text-sm text-muted-foreground">Você vai solicitar</p>
                        <p className="font-display text-2xl font-medium text-foreground tabular">{formatMinutes(suggestedMinutes!)}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                           {certificate != null && certificate > suggestedMinutes!
                              ? `O comprovante tem ${formatMinutes(certificate)}, mas neste pedido cabem ${formatMinutes(suggestedMinutes!)}. ${limitReason} A carga do comprovante fica registrada como está.`
                              : limitReason || null}
                        </p>
                        <Button
                           type="button"
                           variant="link"
                           className="mt-1 h-11 px-0"
                           onClick={() => {
                              setValue("requestedMode", "manual");
                              requestAnimationFrame(() => document.getElementById("ac-requested-hours")?.focus());
                           }}
                        >
                           Quero solicitar menos horas
                        </Button>
                        {errors.requested?.message ? <p className="text-sm text-destructive">{errors.requested.message}</p> : null}
                     </div>
                  ) : (
                     <Controller
                        control={control}
                        name="requested"
                        render={({ field }) => (
                           <div className="space-y-2">
                              <DurationField
                                 id="ac-requested-hours"
                                 legend="Horas que deseja solicitar"
                                 required
                                 value={field.value}
                                 onChange={v => {
                                    setValue("requestedMode", "manual");
                                    field.onChange(v);
                                 }}
                                 onBlur={field.onBlur}
                                 error={errors.requested?.message}
                                 description={
                                    max != null && max > 0 ? `Você pode pedir até ${formatMinutes(max)} neste pedido.` : undefined
                                 }
                              />
                              {suggestedMinutes != null ? (
                                 <Button type="button" variant="outline" className="h-11" onClick={() => setValue("requestedMode", "auto")}>
                                    Usar o máximo ({formatMinutes(suggestedMinutes)})
                                 </Button>
                              ) : max != null && max > 0 ? (
                                 <Button
                                    type="button"
                                    variant="outline"
                                    className="h-11"
                                    onClick={() => field.onChange(minutesToFields(max))}
                                 >
                                    Usar o máximo ({formatMinutes(max)})
                                 </Button>
                              ) : null}
                           </div>
                        )}
                     />
                  )}

                  {limits && limits.maximum.factors.length > 1 && max != null && max > 0 ? (
                     <Collapsible>
                        <CollapsibleTrigger className="group flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary">
                           Como o limite é calculado
                           <ChevronDown
                              className="size-4 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                              aria-hidden
                           />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                           <ul
                              className="space-y-1 rounded-lg bg-surface px-3 py-2 text-sm text-muted-foreground"
                              id="ac-limit-explanation"
                           >
                              {limits.maximum.factors.map(f => (
                                 <li
                                    key={f.kind}
                                    className={cn("flex justify-between gap-3", binding?.kind === f.kind && "font-medium text-foreground")}
                                 >
                                    <span>{FACTOR_LABEL[f.kind]}</span>
                                    <span className="tabular">{formatMinutes(f.minutes)}</span>
                                 </li>
                              ))}
                              <li className="pt-1 text-xs">
                                 O pedido usa o menor valor. A coordenação decide quantas horas serão computadas.
                              </li>
                           </ul>
                        </CollapsibleContent>
                     </Collapsible>
                  ) : null}

                  {limits?.partialFixedAssignment ? (
                     <p className="text-xs text-warning-foreground">
                        A atribuição prevista é maior que o seu saldo. O aproveitamento parcial depende da análise da coordenação.
                     </p>
                  ) : null}
               </>
            )}
         </Block>

         <Collapsible open={detailsOpen || !!errors.details} onOpenChange={setDetailsOpen}>
            <div className="rounded-xl border border-border bg-card">
               <CollapsibleTrigger className="group flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left text-sm font-medium text-foreground sm:px-5">
                  Quer acrescentar alguma informação? <span className="font-normal text-muted-foreground">(opcional)</span>
                  <ChevronDown
                     className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                     aria-hidden
                  />
               </CollapsibleTrigger>
               <CollapsibleContent className="space-y-2 px-4 pb-4 sm:px-5">
                  <FieldLabel htmlFor="ac-details">Informações complementares</FieldLabel>
                  <Textarea
                     id="ac-details"
                     rows={4}
                     className="min-h-24 text-base md:text-sm"
                     placeholder="Ex.: tema, carga por dia ou função exercida"
                     aria-invalid={!!errors.details}
                     aria-describedby={cn("ac-details-count", errors.details && "ac-details-error")}
                     {...register("details")}
                  />
                  <p
                     id="ac-details-count"
                     className={cn("text-xs tabular", remaining < 0 ? "font-medium text-destructive" : "text-muted-foreground")}
                  >
                     {descriptionLength.toLocaleString("pt-BR")} de {LEGACY_DESCRIPTION_LIMIT.toLocaleString("pt-BR")} caracteres no total
                     (contando nome e organizador).
                  </p>
                  <FieldError id="ac-details-error" message={errors.details?.message} />
               </CollapsibleContent>
            </div>
         </Collapsible>

         {correction ? (
            <div className="space-y-2 rounded-xl border border-border bg-card p-4 sm:p-5">
               <FieldLabel htmlFor="ac-student-response">Mensagem para a coordenação (opcional)</FieldLabel>
               <Textarea
                  id="ac-student-response"
                  rows={3}
                  className="min-h-20 text-base md:text-sm"
                  maxLength={2000}
                  placeholder="Ex.: anexei o certificado em melhor resolução."
                  {...register("studentResponse")}
               />
            </div>
         ) : null}
      </div>
   );
}
