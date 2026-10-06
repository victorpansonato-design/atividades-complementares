import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, Hourglass } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CourseSummary } from "../../types/budget.schema";
import { formatMinutes, formatMinutesLong } from "../../rules/duration";

interface ProgressSummaryProps {
   summary: CourseSummary;
   /** Quantos itens precisam do aluno (correções e rascunhos). */
   needsYou?: number;
   onGoTo?: (section: "precisa" | "analise") => void;
   /** Ação principal (ex.: "Solicitar horas"), exibida no celular logo abaixo dos números. */
   action?: ReactNode;
}

/**
 * Resumo com o MESMO modelo visual do portal do aluno (continuidade): percentual,
 * barra verde (cumpridas) e vermelha (restantes) e legenda Cumpridas / Exigidas /
 * Restantes. Só horas aprovadas entram na barra; horas em análise ficam à parte.
 */
export function ProgressSummary({ summary, needsYou = 0, onGoTo, action }: ProgressSummaryProps) {
   const { requiredMinutes, approvedMinutes, remainingMinutes, progressRatio, awaitingMinutes } = summary;
   const percent = progressRatio != null ? Math.round(progressRatio * 100) : null;

   return (
      <Card className="gap-0 py-0">
         <CardContent className="space-y-4 px-4 py-5 sm:px-6">
            <h2 className="sr-only">Suas horas complementares</h2>

            {requiredMinutes != null && percent != null ? (
               <>
                  <div className="flex items-end justify-between gap-3">
                     <p className="flex items-baseline gap-2">
                        <span className="font-display text-[40px] font-semibold leading-none text-foreground tabular">{percent}%</span>
                        <span className="text-sm text-muted-foreground">das horas complementares</span>
                     </p>
                     {summary.isComplete ? (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
                           <CheckCircle2 className="size-4" aria-hidden /> Concluído
                        </span>
                     ) : null}
                  </div>

                  <div
                     role="progressbar"
                     aria-label="Horas cumpridas"
                     aria-valuemin={0}
                     aria-valuemax={100}
                     aria-valuenow={percent}
                     aria-valuetext={`${formatMinutesLong(approvedMinutes)} cumpridas de ${formatMinutesLong(requiredMinutes)} exigidas. Restam ${formatMinutesLong(remainingMinutes ?? 0)}.`}
                     className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full"
                  >
                     {percent > 0 ? (
                        <div className="h-full rounded-l-full bg-success last:rounded-r-full" style={{ width: `${percent}%` }} />
                     ) : null}
                     {percent < 100 ? <div className="h-full flex-1 rounded-r-full bg-destructive first:rounded-l-full" /> : null}
                  </div>

                  <dl className="grid grid-cols-3 gap-2">
                     <Stat dot="bg-success" label="Cumpridas" value={formatMinutes(approvedMinutes)} />
                     <Stat dot="bg-warning" label="Exigidas" value={formatMinutes(requiredMinutes)} />
                     <Stat dot="bg-destructive" label="Restantes" value={formatMinutes(remainingMinutes ?? 0)} />
                  </dl>
               </>
            ) : (
               <div>
                  <p className="font-display text-2xl font-medium text-foreground tabular">{formatMinutes(approvedMinutes)} cumpridas</p>
                  <p className="text-sm text-muted-foreground">A carga exigida da sua matriz ainda não foi informada.</p>
               </div>
            )}

            {action ? <div className="sm:hidden">{action}</div> : null}

            {awaitingMinutes > 0 || needsYou > 0 ? (
               <div className="grid gap-2 sm:grid-cols-2">
                  {awaitingMinutes > 0 ? (
                     <StatButton
                        icon={Hourglass}
                        value={formatMinutes(awaitingMinutes)}
                        label="em análise"
                        hint="Ainda não contam: entram quando aprovadas"
                        onClick={onGoTo ? () => onGoTo("analise") : undefined}
                     />
                  ) : null}
                  {needsYou > 0 ? (
                     <StatButton
                        icon={AlertTriangle}
                        tone="warning"
                        value={String(needsYou)}
                        label={needsYou === 1 ? "item precisa de você" : "itens precisam de você"}
                        hint="Toque para resolver"
                        onClick={onGoTo ? () => onGoTo("precisa") : undefined}
                     />
                  ) : null}
               </div>
            ) : null}

            {summary.analysisSlaBusinessDays ? (
               <p className="text-xs text-muted-foreground">
                  Prazo informado para análise: até {summary.analysisSlaBusinessDays} dias úteis.
               </p>
            ) : null}
         </CardContent>
      </Card>
   );
}

function Stat({ dot, label, value }: { dot: string; label: string; value: string }) {
   return (
      <div className="min-w-0">
         <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
            <span className={cn("size-2 shrink-0 rounded-full", dot)} aria-hidden />
            {label}
         </dt>
         <dd className="mt-0.5 font-display text-lg font-semibold text-foreground tabular">{value}</dd>
      </div>
   );
}

function StatButton({
   icon: Icon,
   value,
   label,
   hint,
   tone = "neutral",
   onClick,
}: {
   icon: typeof Hourglass;
   value: string;
   label: string;
   hint: string;
   tone?: "neutral" | "warning";
   onClick?: () => void;
}) {
   const content = (
      <>
         <Icon className={cn("size-5 shrink-0", tone === "warning" ? "text-warning-foreground" : "text-muted-foreground")} aria-hidden />
         <span className="min-w-0 flex-1 text-left">
            <span className="block text-sm text-foreground">
               <strong className="font-semibold tabular">{value}</strong> {label}
            </span>
            <span className="block text-xs text-muted-foreground">{hint}</span>
         </span>
         {onClick ? <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
      </>
   );
   const classes = cn(
      "flex min-h-14 w-full items-center gap-3 rounded-lg border px-3 py-2",
      tone === "warning" ? "border-warning/50 bg-warning-soft" : "border-border bg-surface",
   );
   return onClick ? (
      <button
         type="button"
         onClick={onClick}
         className={cn(
            classes,
            "transition-colors active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
         )}
      >
         {content}
      </button>
   ) : (
      <div className={classes}>{content}</div>
   );
}
