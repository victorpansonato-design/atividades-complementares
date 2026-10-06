/**
 * Documentos exigidos por tipo/modalidade. Cada requisito é "este documento" ou
 * "uma destas alternativas" (anyOf). Um arquivo pode cobrir mais de um requisito
 * quando o aluno indica que ele realmente comprova ambos.
 *
 * Selecionar um arquivo NÃO comprova autenticidade: isso é análise posterior.
 */
import type { ActivityType } from "../types/catalog.schema";
import type { Attachment } from "../types/request.schema";
import type { InstitutionalRecordState } from "../types/student.schema";

export type ResolvedRequirement =
   | { kind: "upload"; key: string; anyOf: string[]; canShareFileWithOtherRequirements: boolean }
   | { kind: "institutional"; key: string; description: string };

/** `null` = depende de uma modalidade ainda não escolhida. */
export function resolveRequirements(activity: ActivityType, modeId: string | null | undefined): ResolvedRequirement[] | null {
   const result: ResolvedRequirement[] = [];
   for (const requirement of activity.documentRequirements) {
      if ("source" in requirement) {
         result.push({ kind: "institutional", key: requirement.key, description: requirement.description });
      } else if ("conditional" in requirement) {
         if (!modeId) return null;
         for (const inner of requirement.modes[modeId] ?? []) {
            result.push({ kind: "upload", ...inner });
         }
      } else {
         result.push({ kind: "upload", ...requirement });
      }
   }
   return result;
}

export function requirementLabel(requirement: ResolvedRequirement): string {
   if (requirement.kind === "institutional") return requirement.description;
   return requirement.anyOf.join(" ou ");
}

export interface RequirementCoverage {
   requirement: ResolvedRequirement;
   covered: boolean;
   /** Arquivos que o aluno indicou para este requisito. */
   attachmentIds: string[];
   /** Estado do registro institucional (somente requisitos institucionais). */
   institutionalState: InstitutionalRecordState | null;
   /** Arquivo compartilhado com outro requisito quando a regra exige arquivo separado. */
   sharingConflict: boolean;
}

export function evaluateCoverage(
   requirements: ResolvedRequirement[],
   attachments: Pick<Attachment, "id" | "requirementKeys">[],
   institutionalRecords: Record<string, InstitutionalRecordState>,
): { items: RequirementCoverage[]; allCovered: boolean } {
   const items = requirements.map<RequirementCoverage>(requirement => {
      if (requirement.kind === "institutional") {
         const state = institutionalRecords[requirement.key] ?? "unknown";
         // O aluno não anexa documento inexistente: o requisito é cumprido pelo cadastro institucional.
         return { requirement, covered: true, attachmentIds: [], institutionalState: state, sharingConflict: false };
      }
      const files = attachments.filter(a => a.requirementKeys.includes(requirement.key));
      const sharingConflict =
         !requirement.canShareFileWithOtherRequirements && files.some(f => f.requirementKeys.filter(k => k !== requirement.key).length > 0);
      return {
         requirement,
         covered: files.length > 0 && !sharingConflict,
         attachmentIds: files.map(f => f.id),
         institutionalState: null,
         sharingConflict,
      };
   });
   return { items, allCovered: items.every(i => i.covered) };
}

export function uploadRequirementKeys(requirements: ResolvedRequirement[] | null): string[] {
   return (requirements ?? []).filter(r => r.kind === "upload").map(r => r.key);
}
