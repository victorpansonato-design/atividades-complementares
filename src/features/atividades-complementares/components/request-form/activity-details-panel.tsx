import { useFormContext } from "react-hook-form";
import { ArrowRight, Ban, ChevronDown, CircleDashed, FileCheck2, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { StudentContext } from "../../types/student.schema";
import { displayCode, presentActivity } from "../../content/catalog-presentation";
import { activityRuleLines, BLOCK_REASON, unitRuleText } from "../../content/texts";
import { isFixedAssignment, requiresMode } from "../../rules/budget";
import { formatMinutes } from "../../rules/duration";
import type { ActivityAvailability } from "../../rules/limits";
import { requirementLabel, resolveRequirements } from "../../rules/requirements";
import type { RequestFormValues } from "./form-model";

function periodLabel(student: StudentContext, id: string) {
   return student.academicPeriods.find(p => p.id === id)?.label ?? id;
}

interface ActivityDetailsPanelProps {
   availability: ActivityAvailability;
   student: StudentContext;
   /** Avança para o passo 2. Ausente = só consulta. */
   onContinue?: () => void;
   /** Fecha/escolhe outra (gaveta no celular). */
   onChooseAnother?: () => void;
   headingId?: string;
}

/**
 * Resumo do tipo escolhido, em três respostas: quanto posso pedir, como conta e o
 * que anexar. Regra completa, código e saldo detalhado ficam recolhidos.
 */
export function ActivityDetailsPanel({ availability, student, onContinue, onChooseAnother, headingId }: ActivityDetailsPanelProps) {
   const { register, watch, formState } = useFormContext<RequestFormValues>();
   const { activity } = availability;
   const presentation = presentActivity(activity);
   const modeId = watch("modeId");
   const needsMode = requiresMode(activity);
   const requirements = resolveRequirements(activity, modeId);
   const modeError = formState.errors.modeId?.message;
   const blocked = availability.blockReason;
   const fixed =
      activity.unitRule && (isFixedAssignment(activity.unitRule.kind) || activity.unitRule.modes?.some(m => isFixedAssignment(m.kind)));
   const pages = activity.source?.page ? [activity.source.page, ...(activity.source.additionalPages ?? [])] : [];
   const mainRule =
      activity.unitRule && activity.unitRule.kind !== "mode_dependent"
         ? unitRuleText({ kind: activity.unitRule.kind, limitMinutes: activity.unitRule.limitMinutes })
         : null;

   return (
      <div className="space-y-5 text-sm">
         <div>
            <h3 id={headingId} className="font-display text-lg font-medium leading-tight text-foreground">
               {presentation.shortName}
            </h3>
            <p className="mt-1 text-muted-foreground">{presentation.example}</p>
         </div>

         {/* 1. Quanto posso pedir */}
         {blocked ? (
            <div
               className={cn(
                  "rounded-xl border px-4 py-3",
                  blocked === "reserved_in_review" ? "border-primary/30 bg-primary-soft/50" : "border-warning/40 bg-warning-soft",
               )}
            >
               <p className="flex items-center gap-2 font-semibold text-foreground">
                  {blocked === "reserved_in_review" ? <Lock className="size-4" aria-hidden /> : <Ban className="size-4" aria-hidden />}
                  {BLOCK_REASON[blocked].title}
               </p>
               <p className="mt-1 text-foreground">{BLOCK_REASON[blocked].hint}</p>
               {blocked === "reserved_in_review" || blocked === "one_time_in_review" ? (
                  <Link
                     to="/?situacao=em-analise"
                     className="mt-1 inline-flex h-11 items-center font-medium text-primary underline underline-offset-4"
                  >
                     Ver pedidos em análise
                  </Link>
               ) : null}
            </div>
         ) : availability.semesterLimitMinutes != null && availability.currentPeriodAvailableMinutes != null ? (
            <div className="rounded-xl border border-success/40 bg-success-soft/50 px-4 py-3">
               <p className="text-muted-foreground">Conta por semestre</p>
               <p className="font-display text-2xl font-medium text-foreground tabular">
                  até {formatMinutes(availability.semesterLimitMinutes)}
               </p>
               <p className="mt-1 text-muted-foreground">
                  Em {periodLabel(student, student.currentAcademicPeriodId)} você ainda tem{" "}
                  {formatMinutes(availability.currentPeriodAvailableMinutes)} livres. Total restante neste tipo:{" "}
                  {formatMinutes(availability.availableMinutes ?? 0)}.
               </p>
            </div>
         ) : availability.availableMinutes != null ? (
            <div className="rounded-xl border border-success/40 bg-success-soft/50 px-4 py-3">
               <p className="text-muted-foreground">Você ainda pode pedir neste tipo</p>
               <p className="font-display text-2xl font-medium text-foreground tabular">
                  até {formatMinutes(availability.availableMinutes)}
               </p>
            </div>
         ) : null}

         {/* Opção obrigatória antes de continuar */}
         {needsMode && activity.unitRule?.modes && !blocked ? (
            <fieldset className="space-y-2" aria-describedby={modeError ? "ac-mode-error" : undefined}>
               <legend className="mb-2 font-medium text-foreground">Qual opção descreve o que você fez?</legend>
               {activity.unitRule.modes.map((mode, index) => (
                  <label
                     key={mode.id}
                     className="flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2.5 has-checked:border-primary has-checked:bg-primary-soft has-focus-visible:ring-2 has-focus-visible:ring-ring"
                  >
                     <input
                        type="radio"
                        value={mode.id}
                        id={index === 0 ? "ac-mode" : undefined}
                        className="mt-0.5 size-5 accent-primary"
                        {...register("modeId")}
                     />
                     <span>
                        <span className="block font-medium text-foreground">{mode.label}</span>
                        <span className="block text-xs text-muted-foreground">{unitRuleText(mode)}</span>
                     </span>
                  </label>
               ))}
               {modeError ? (
                  <p id="ac-mode-error" className="text-sm text-destructive">
                     {modeError}
                  </p>
               ) : null}
            </fieldset>
         ) : null}

         {/* 2. Como conta */}
         {mainRule ? (
            <div>
               <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Como conta</p>
               <p className="mt-1 text-foreground">{mainRule}.</p>
               {fixed ? <p className="mt-1 text-xs text-muted-foreground">A coordenação confirma as horas na análise.</p> : null}
            </div>
         ) : null}

         {/* 3. O que anexar */}
         <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">O que anexar</p>
            {requirements === null ? (
               <p className="mt-1 flex items-center gap-2 text-muted-foreground">
                  <CircleDashed className="size-4" aria-hidden /> Escolha a opção acima para ver os documentos.
               </p>
            ) : (
               <ul className="mt-1 space-y-1.5">
                  {requirements.map(r => (
                     <li key={r.key} className="flex items-start gap-2 text-foreground">
                        <FileCheck2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                        <span>
                           {r.kind === "institutional" ? "Nada: a coordenação registra o seu cadastro no sistema." : requirementLabel(r)}
                        </span>
                     </li>
                  ))}
               </ul>
            )}
            {activity.exclusions.length ? (
               <p className="mt-2 text-xs text-muted-foreground">Não vale para: {activity.exclusions.join("; ")}.</p>
            ) : null}
         </div>

         <Collapsible>
            <CollapsibleTrigger className="group flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary">
               Regra completa e saldo
               <ChevronDown
                  className="size-4 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                  aria-hidden
               />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 rounded-lg bg-surface p-3 text-xs text-muted-foreground">
               <p className="text-sm text-foreground">{activity.displayName}</p>
               <ul className="list-disc space-y-0.5 pl-4">
                  {activityRuleLines(activity).map(line => (
                     <li key={line}>{line}</li>
                  ))}
               </ul>
               {activity.totalLimitMinutes != null ? (
                  <p className="tabular">
                     Aprovadas: {formatMinutes(availability.approvedMinutes)} · Em análise: {formatMinutes(availability.reservedMinutes)} ·
                     Disponível: {formatMinutes(availability.availableMinutes ?? 0)}
                  </p>
               ) : null}
               <p>
                  Código <span className="font-mono">{displayCode(activity)}</span>
                  {pages.length ? ` · Regulamento 2025, p. ${pages.join(" e ")}` : ""}
               </p>
               {activity.provenanceNote ? <p>{activity.provenanceNote}</p> : null}
            </CollapsibleContent>
         </Collapsible>

         {onContinue || onChooseAnother ? (
            <div className="flex flex-col gap-2">
               {onContinue && !blocked ? (
                  <Button type="button" size="lg" className="w-full gap-2" onClick={onContinue}>
                     Continuar com esta atividade <ArrowRight className="size-4" aria-hidden />
                  </Button>
               ) : null}
               {onChooseAnother ? (
                  <Button type="button" variant={blocked ? "default" : "ghost"} className="h-11 w-full" onClick={onChooseAnother}>
                     Escolher outra atividade
                  </Button>
               ) : null}
            </div>
         ) : null}
      </div>
   );
}
