import type { ReactNode } from "react";
import { useFormContext } from "react-hook-form";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { presentActivity } from "../../content/catalog-presentation";
import { formatDateRange } from "../../rules/dates";
import { formatMinutes } from "../../rules/duration";
import { requirementLabel } from "../../rules/requirements";
import type { DerivedState, FormContext, RequestFormValues } from "./form-model";

interface StepReviewProps {
   ctx: FormContext;
   derived: DerivedState;
   headingRef: React.Ref<HTMLHeadingElement>;
   onEdit: (step: 1 | 2, focusId: string) => void;
   submitError?: ReactNode;
}

function Row({ label, children, onEdit, editLabel }: { label: string; children: ReactNode; onEdit: () => void; editLabel: string }) {
   return (
      <div className="flex items-start gap-3 py-3">
         <div className="min-w-0 flex-1">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 wrap-break-word text-sm text-foreground">{children}</dd>
         </div>
         <Button type="button" variant="ghost" size="sm" className="-mr-2 h-11 px-2.5 text-primary" onClick={onEdit}>
            Editar<span className="sr-only"> {editLabel}</span>
         </Button>
      </div>
   );
}

/** Revisão em um único "comprovante do pedido": o essencial, com edição por linha. */
export function StepReview({ ctx, derived, headingRef, onEdit, submitError }: StepReviewProps) {
   const { register, getValues, formState } = useFormContext<RequestFormValues>();
   const values = getValues();
   const { activity, limits, requirements } = derived;
   if (!activity) return null;
   const presentation = presentActivity(activity);
   const mode = activity.unitRule?.modes?.find(m => m.id === values.modeId);
   const period = ctx.student.academicPeriods.find(p => p.id === values.academicPeriodId);
   const usable = values.attachments.filter(a => a.state !== "missing");
   const requested = derived.requestedMinutes;
   const certificate = limits?.certificateUsage !== "hidden" ? derived.certificateMinutes : null;

   return (
      <div className="space-y-4">
         <div>
            <h2 ref={headingRef} tabIndex={-1} className="font-display text-xl font-medium text-foreground outline-none">
               Revise e envie
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Depois do envio, o pedido só muda se a coordenação pedir correção.</p>
         </div>

         {submitError}

         <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border bg-primary-soft/50 px-4 py-4 sm:px-5">
               <p className="text-sm text-muted-foreground">Você vai solicitar</p>
               <p className="font-display text-3xl font-medium text-foreground tabular">
                  {requested != null ? formatMinutes(requested) : "-"}
               </p>
               <p className="mt-1 text-sm text-muted-foreground">
                  {presentation.shortName}
                  {mode ? ` · ${mode.label}` : ""}
               </p>
            </div>
            <dl className="divide-y divide-border px-4 sm:px-5">
               <Row label="Atividade" editLabel="atividade" onEdit={() => onEdit(1, `ac-activity-${activity.localId}`)}>
                  <span className="font-medium">{values.title}</span>
                  {values.organizer.trim() ? <span className="block text-muted-foreground">{values.organizer}</span> : null}
               </Row>
               <Row label="Quando" editLabel="data" onEdit={() => onEdit(2, "ac-start-date")}>
                  {formatDateRange(values.startDate, values.endDate)} · período {period?.label ?? "-"}
               </Row>
               <Row
                  label="Horas"
                  editLabel="horas"
                  onEdit={() => onEdit(2, certificate != null ? "ac-certificate-hours" : "ac-requested-hours")}
               >
                  {requested != null ? `${formatMinutes(requested)} solicitadas` : "-"}
                  {certificate != null ? (
                     <span className="text-muted-foreground"> · comprovante com {formatMinutes(certificate)}</span>
                  ) : null}
               </Row>
               <Row label="Comprovantes" editLabel="comprovantes" onEdit={() => onEdit(2, "ac-attachments")}>
                  {usable.length ? (
                     <ul className="space-y-1">
                        {usable.map(a => (
                           <li key={a.id} className="flex items-center gap-1.5">
                              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                              <span className="truncate">{a.name}</span>
                           </li>
                        ))}
                     </ul>
                  ) : requirements?.every(r => r.kind === "institutional") ? (
                     "Não é preciso anexar: comprovação pelo cadastro da coordenação."
                  ) : (
                     "Nenhum arquivo"
                  )}
                  {requirements?.some(r => r.kind === "institutional") && usable.length ? (
                     <span className="block text-xs text-muted-foreground">
                        {requirements
                           .filter(r => r.kind === "institutional")
                           .map(r => requirementLabel(r))
                           .join("; ")}
                     </span>
                  ) : null}
               </Row>
               {values.details.trim() ? (
                  <Row label="Informações complementares" editLabel="informações complementares" onEdit={() => onEdit(2, "ac-details")}>
                     <span className="line-clamp-3 whitespace-pre-line">{values.details}</span>
                  </Row>
               ) : null}
            </dl>
         </div>

         <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <label htmlFor="ac-declaration" className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-foreground">
               <input
                  id="ac-declaration"
                  type="checkbox"
                  className="mt-0.5 size-5 shrink-0 accent-primary"
                  aria-invalid={!!formState.errors.declaration}
                  aria-describedby={formState.errors.declaration ? "ac-declaration-error" : "ac-declaration-hint"}
                  {...register("declaration")}
               />
               <span>
                  <span className="font-medium">Confirmo que as informações e os documentos apresentados são verdadeiros.</span>
                  <span id="ac-declaration-hint" className="mt-1 block text-xs text-muted-foreground">
                     Você é responsável pela veracidade (regulamento, art. 5º). A coordenação analisa e decide as horas.
                  </span>
               </span>
            </label>
            {formState.errors.declaration ? (
               <p id="ac-declaration-error" className="mt-2 text-sm text-destructive">
                  {formState.errors.declaration.message}
               </p>
            ) : null}
         </div>

         <p className="text-xs text-muted-foreground">
            Você recebe um protocolo na hora. As horas só entram no seu progresso depois de aprovadas
            {ctx.student.policies.analysisSlaBusinessDays
               ? ` (análise em até ${ctx.student.policies.analysisSlaBusinessDays} dias úteis)`
               : ""}
            .
         </p>
      </div>
   );
}
