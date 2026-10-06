/**
 * Resumo do curso e saldos por orçamento (código/subtipo + versão de catálogo).
 * Calculados pelo gateway. No futuro, o backend é a autoridade.
 */
import { z } from "zod";

export const PeriodUsageSchema = z.object({
   approvedMinutes: z.number().int().nonnegative(),
   reservedMinutes: z.number().int().nonnegative(),
});
export type PeriodUsage = z.infer<typeof PeriodUsageSchema>;

export const BudgetSchema = z.object({
   budgetKey: z.string(),
   catalogVersion: z.string(),
   totalLimitMinutes: z.number().int().nonnegative().nullable(),
   approvedMinutes: z.number().int().nonnegative(),
   reservedMinutes: z.number().int().nonnegative(),
   /** `null` quando o teto é desconhecido (não inventar limite). */
   availableMinutes: z.number().int().nonnegative().nullable(),
   byPeriod: z.record(z.string(), PeriodUsageSchema),
   approvedUses: z.number().int().nonnegative(),
   activeUses: z.number().int().nonnegative(),
});
export type Budget = z.infer<typeof BudgetSchema>;

export const BudgetSnapshotSchema = z.object({
   /** Revisão para detectar mudança concorrente entre leitura e envio. */
   revision: z.string(),
   items: z.array(BudgetSchema),
});
export type BudgetSnapshot = z.infer<typeof BudgetSnapshotSchema>;

export const CourseSummarySchema = z.object({
   requiredMinutes: z.number().int().nonnegative().nullable(),
   approvedMinutes: z.number().int().nonnegative(),
   /** `null` quando a carga exigida não foi informada. */
   remainingMinutes: z.number().int().nonnegative().nullable(),
   progressRatio: z.number().min(0).max(1).nullable(),
   /** Horas aguardando decisão (em análise + pendência + reconsideração). Não contam no progresso. */
   awaitingMinutes: z.number().int().nonnegative(),
   awaitingInCorrectionMinutes: z.number().int().nonnegative(),
   isComplete: z.boolean(),
   analysisSlaBusinessDays: z.number().int().positive().nullable(),
});
export type CourseSummary = z.infer<typeof CourseSummarySchema>;
