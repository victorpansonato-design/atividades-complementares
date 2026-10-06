import { describe, expect, it } from "vitest";
import { catalog2025, legacyCatalog, unknownInstitutionalTypes } from "@/features/atividades-complementares/mock/catalog-source";
import { buildSeedRequests, buildStudentContext } from "@/features/atividades-complementares/mock/seed";
import { buildBudgets, computeCourseSummary, findBudget } from "@/features/atividades-complementares/rules/budget";
import {
   checkAdmission,
   checkPeriodConsistency,
   computeSubmissionWindow,
   effectiveActionDeadline,
   formatIsoDate,
   suggestPeriod,
} from "@/features/atividades-complementares/rules/dates";
import {
   composeLegacyDescription,
   LEGACY_DESCRIPTION_LIMIT,
   remainingDescriptionCharacters,
} from "@/features/atividades-complementares/rules/description";
import { formatMinutes, parseDurationFields, toLegacyHHmm } from "@/features/atividades-complementares/rules/duration";
import { matchesSignature, validateFile, validateFileBasics } from "@/features/atividades-complementares/rules/files";
import { computeRequestLimits, evaluateActivity } from "@/features/atividades-complementares/rules/limits";
import { evaluateCoverage, resolveRequirements } from "@/features/atividades-complementares/rules/requirements";
import { matchesQuery } from "@/features/atividades-complementares/rules/search";
import { presentActivity } from "@/features/atividades-complementares/content/catalog-presentation";

const byId = (id: string) => catalog2025.find(a => a.localId === id)!;
const allTypes = [...catalog2025, ...unknownInstitutionalTypes, ...legacyCatalog];

function scenario(id: string) {
   const student = buildStudentContext(id);
   const requests = buildSeedRequests(id);
   return {
      student,
      requests,
      budgets: buildBudgets(requests, allTypes, student.policies),
      summary: computeCourseSummary(requests, student),
   };
}

describe("catálogo 2025", () => {
   it("tem as 38 linhas/subtipos do anexo, sem fundir variantes", () => {
      expect(catalog2025).toHaveLength(38);
      expect(new Set(catalog2025.map(a => a.budgetKey)).size).toBe(38);
      expect(byId("25_003-a").totalLimitMinutes).toBe(2400);
      expect(byId("25_003-b").totalLimitMinutes).toBe(3600);
   });

   it("só 25_003a/b têm sufixo de sistema confirmado", () => {
      const withSuffix = catalog2025.filter(a => a.systemCode && /[a-z]$/.test(a.systemCode)).map(a => a.systemCode);
      expect(withSuffix.sort()).toEqual(["25_003a", "25_003b"]);
   });

   it("todas as linhas têm apresentação (nome curto e categoria)", () => {
      for (const a of catalog2025) {
         expect(presentActivity(a).example, a.localId).not.toBe("");
         expect(presentActivity(a).keywords, a.localId).not.toBe("");
      }
   });

   it("25_030 não tem teto nem envio manual", () => {
      expect(unknownInstitutionalTypes[0]).toMatchObject({ localId: "25_030", totalLimitMinutes: null, manualSubmission: false });
   });
});

describe("cenários do fixture", () => {
   it("base: 26h aprovadas de 160h, faltam 134h, 30h aguardando", () => {
      const { summary, budgets } = scenario("base");
      expect(summary).toMatchObject({
         approvedMinutes: 1560,
         requiredMinutes: 9600,
         remainingMinutes: 8040,
         awaitingMinutes: 1800,
         awaitingInCorrectionMinutes: 600,
      });
      expect(summary.progressRatio).toBeCloseTo(0.1625);
      expect(findBudget(budgets, byId("25_009"))).toMatchObject({ approvedMinutes: 1260, availableMinutes: 4740 });
      expect(findBudget(budgets, byId("25_012"))).toMatchObject({ reservedMinutes: 1200, availableMinutes: 1800 });
   });

   it("base: 25_030 conta no total sem gerar saldo fictício", () => {
      const { budgets } = scenario("base");
      const unknown = budgets.find(b => b.budgetKey === "mock:2025:25_030")!;
      expect(unknown.approvedMinutes).toBe(300);
      expect(unknown.availableMinutes).toBeNull();
   });

   it.each([
      ["limite_aprovado", "25_009", "approved_limit_reached"],
      ["saldo_reservado", "25_009", "reserved_in_review"],
      ["uso_unico", "25_028", "one_time_used"],
   ])("%s bloqueia %s com %s", (id, localId, reason) => {
      const { student, budgets, summary } = scenario(id);
      const a = byId(localId);
      const result = evaluateActivity({
         activity: a,
         budget: findBudget(budgets, a),
         student,
         catalog: { submissionAvailable: true },
         courseComplete: summary.isComplete,
      });
      expect(result.blockReason).toBe(reason);
   });

   it("limite_semestral: semestre 2026/2 sem saldo, tipo com 180h", () => {
      const { student, budgets } = scenario("limite_semestral");
      const a = byId("25_025");
      const limits = computeRequestLimits({
         activity: a,
         modeId: null,
         budget: findBudget(budgets, a),
         periodId: "2026-2",
         certificateMinutes: null,
         policies: student.policies,
      });
      expect(limits.typeAvailableMinutes).toBe(10800);
      expect(limits.semesterAvailableMinutes).toBe(0);
      expect(limits.maximum.maximumMinutes).toBe(0);
      // outro período continua com o limite semestral cheio
      const other = computeRequestLimits({
         activity: a,
         modeId: null,
         budget: findBudget(budgets, a),
         periodId: "2027-1",
         certificateMinutes: null,
         policies: student.policies,
      });
      expect(other.maximum.maximumMinutes).toBe(1200);
   });

   it("concluido: carga completa sem bloqueio global", () => {
      const { student, summary, budgets } = scenario("concluido");
      expect(summary).toMatchObject({ approvedMinutes: 9600, remainingMinutes: 0, isComplete: true });
      const a = byId("25_011");
      expect(
         evaluateActivity({
            activity: a,
            budget: findBudget(budgets, a),
            student,
            catalog: { submissionAvailable: true },
            courseComplete: true,
         }).submittable,
      ).toBe(true);
   });

   it("vazio: nada aprovado", () => {
      expect(scenario("vazio").summary).toMatchObject({ approvedMinutes: 0, remainingMinutes: 9600 });
   });

   it("histórico legado: soma 174h de 200h sem aplicar o catálogo 2025", () => {
      const { summary, budgets } = scenario("historico_legado");
      expect(summary).toMatchObject({ approvedMinutes: 10440, remainingMinutes: 1560 });
      expect(budgets.find(b => b.budgetKey === "mock:legado:18_021")).toMatchObject({ approvedMinutes: 9600, availableMinutes: 0 });
   });

   it("não-elegível: aproveitamentos ocultos para o perfil comum", () => {
      const { student, budgets } = scenario("base");
      const a = byId("25_024");
      expect(
         evaluateActivity({
            activity: a,
            budget: findBudget(budgets, a),
            student,
            catalog: { submissionAvailable: true },
            courseComplete: false,
         }).blockReason,
      ).toBe("not_eligible");
   });
});

describe("limite por pedido", () => {
   const budget = undefined;
   const policies = { partialCreditForFixedAssignment: "allow_with_notice" as const };

   it("publicação: até 20h por publicação", () => {
      const l = computeRequestLimits({
         activity: byId("25_003-a"),
         modeId: null,
         budget,
         periodId: "2026-2",
         certificateMinutes: null,
         policies,
      });
      expect(l.maximum.maximumMinutes).toBe(1200);
      expect(l.certificateUsage).toBe("hidden");
   });

   it("modalidade obrigatória: 25_018 depende da opção", () => {
      expect(
         computeRequestLimits({ activity: byId("25_018"), modeId: null, budget, periodId: null, certificateMinutes: null, policies })
            .needsMode,
      ).toBe(true);
      const campaign = computeRequestLimits({
         activity: byId("25_018"),
         modeId: "campanha_unianchieta",
         budget,
         periodId: null,
         certificateMinutes: null,
         policies,
      });
      expect(campaign.maximum.maximumMinutes).toBe(900);
      const other = computeRequestLimits({
         activity: byId("25_018"),
         modeId: "outras",
         budget,
         periodId: null,
         certificateMinutes: 3000,
         policies,
      });
      expect(other.maximum.maximumMinutes).toBe(2400);
      expect(other.certificateUsage).toBe("required");
   });

   it("atribuição fixa com saldo menor gera aviso de crédito parcial (configurável)", () => {
      const partialBudget = {
         budgetKey: "x",
         catalogVersion: "x",
         totalLimitMinutes: 3600,
         approvedMinutes: 3540,
         reservedMinutes: 0,
         availableMinutes: 60,
         byPeriod: {},
         approvedUses: 0,
         activeUses: 0,
      };
      const l = computeRequestLimits({
         activity: byId("25_020-participacao"),
         modeId: null,
         budget: partialBudget,
         periodId: null,
         certificateMinutes: null,
         policies,
      });
      expect(l.maximum.maximumMinutes).toBe(60);
      expect(l.partialFixedAssignment).toBe(true);
      const blocked = computeRequestLimits({
         activity: byId("25_020-participacao"),
         modeId: null,
         budget: partialBudget,
         periodId: null,
         certificateMinutes: null,
         policies: { partialCreditForFixedAssignment: "block" },
      });
      expect(blocked.maximum.maximumMinutes).toBe(0);
   });
});

describe("documentos", () => {
   it("um arquivo pode cobrir dois requisitos (25_012)", () => {
      const reqs = resolveRequirements(byId("25_012"), null)!;
      expect(evaluateCoverage(reqs, [{ id: "f", requirementKeys: ["certificado", "tempo"] }], {}).allCovered).toBe(true);
      expect(evaluateCoverage(reqs, [{ id: "f", requirementKeys: ["certificado"] }], {}).allCovered).toBe(false);
   });

   it("representante: cadastro institucional, sem upload", () => {
      const reqs = resolveRequirements(byId("25_026"), null)!;
      expect(reqs).toEqual([expect.objectContaining({ kind: "institutional" })]);
      expect(evaluateCoverage(reqs, [], { cadastro: "confirmed" }).allCovered).toBe(true);
   });

   it("25_029 depende da modalidade e não pede certificado genérico", () => {
      expect(resolveRequirements(byId("25_029"), null)).toBeNull();
      const keys = resolveRequirements(byId("25_029"), "audiencia")!.map(r => r.key);
      expect(keys).toEqual(["relatorio", "declaracao"]);
   });
});

describe("datas e prazos", () => {
   const student = buildStudentContext("base");

   it("sugere período pelas datas e sinaliza intervalos que atravessam períodos", () => {
      expect(suggestPeriod(student, "2026-09-15", "2026-09-15")).toEqual({ kind: "suggested", periodId: "2026-2" });
      expect(suggestPeriod(student, "2026-06-20", "2026-07-10").kind).toBe("spans_multiple");
      expect(checkPeriodConsistency(student, "2026-1", "2026-09-15", "2026-09-15")).toBe("mismatch");
   });

   it("não deriva período de EAD/híbrido pelos meses", () => {
      expect(suggestPeriod({ ...student, modality: "ead" }, "2026-09-15", "2026-09-15").kind).toBe("not_available");
   });

   it("ingresso: tipos gerais avisam; aproveitamentos ficam isentos", () => {
      expect(checkAdmission(byId("25_025"), "2026-01-15", "2025-02-18", "2025-08-17")).toBe("before_admission");
      expect(checkAdmission(byId("25_025"), "2026-01-15", "2025-12-01", "2026-03-01")).toBe("crosses_admission");
      expect(checkAdmission(byId("25_024"), "2026-01-15", "2020-01-01", "2020-06-01")).toBe("exempt");
   });

   it("concluinte: prazo de entrega limita o prazo da pendência", () => {
      const concluding = buildStudentContext("concluinte");
      expect(effectiveActionDeadline({ actionDeadlineDate: "2027-06-30" }, concluding)).toBe("2026-11-30");
      expect(computeSubmissionWindow(concluding)).toMatchObject({ open: true, deadline: "2026-11-30" });
      expect(computeSubmissionWindow({ ...concluding, referenceDate: "2026-12-01" }).open).toBe(false);
   });

   it("híbrido concluinte sem política: prazo desconhecido, sem data inventada", () => {
      const hybrid = { ...buildStudentContext("base"), modality: "hibrido" as const, isConcluding: true, submissionDeadlineDate: null };
      expect(computeSubmissionWindow(hybrid)).toMatchObject({ open: true, deadline: null, hybridPolicyUnknown: true });
   });

   it("formata datas ISO sem conversão de fuso", () => {
      expect(formatIsoDate("2026-03-19")).toBe("19/03/2026");
   });
});

describe("duração, descrição, arquivos e busca", () => {
   it("horas e minutos, acima de 24h, minutos até 59", () => {
      expect(parseDurationFields({ hours: "1", minutes: "30" })).toEqual({ ok: true, minutes: 90 });
      expect(parseDurationFields({ hours: "160", minutes: "" })).toEqual({ ok: true, minutes: 9600 });
      expect(parseDurationFields({ hours: "1", minutes: "60" }).ok).toBe(false);
      expect(parseDurationFields({ hours: "1,5", minutes: "" }).ok).toBe(false);
      expect(formatMinutes(90)).toBe("1h 30min");
      expect(toLegacyHHmm(9600)).toBe("160:00");
   });

   it("descrição composta respeita 6.000 caracteres no total", () => {
      const parts = { title: "Evento", organizer: "UniAnchieta", details: "x".repeat(100) };
      expect(composeLegacyDescription(parts)).toContain("Instituição/organizador: UniAnchieta");
      expect(remainingDescriptionCharacters({ ...parts, details: "x".repeat(LEGACY_DESCRIPTION_LIMIT) })).toBeLessThan(0);
   });

   it("aceita PDF/DOC/DOCX e recusa imagem ou executável disfarçado", async () => {
      const max = 10 * 1024 * 1024;
      expect(validateFileBasics({ name: "foto.png", type: "image/png", size: 10 }, max)).toMatchObject({ code: "extension" });
      expect(validateFileBasics({ name: "doc.pdf", type: "image/jpeg", size: 10 }, max)).toMatchObject({ code: "mime" });
      expect(validateFileBasics({ name: "grande.pdf", type: "application/pdf", size: max + 1 }, max)).toMatchObject({ code: "size" });
      expect(matchesSignature("pdf", new TextEncoder().encode("%PDF-1.4"))).toBe(true);
      const fake = new File([new Uint8Array([0x4d, 0x5a, 0x90, 0, 3, 0, 0, 0])], "programa.pdf", { type: "application/pdf" });
      expect(await validateFile(fake, max)).toMatchObject({ code: "signature" });
      const real = new File(["%PDF-1.4 conteúdo"], "certificado.pdf", { type: "application/pdf" });
      expect(await validateFile(real, max)).toBeNull();
      const docx = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4])], "termo.docx", { type: "" });
      expect(await validateFile(docx, max)).toBeNull();
   });

   it("busca sem acento e por código", () => {
      const estagio = byId("25_025");
      const p = presentActivity(estagio);
      expect(matchesQuery("estagio", [p.shortName, estagio.displayName], [estagio.localId])).toBe(true);
      const pub = byId("25_003-a");
      expect(matchesQuery("25_003a", [presentActivity(pub).shortName], [pub.localId, pub.systemCode])).toBe(true);
      expect(matchesQuery("25003a", [], [pub.systemCode])).toBe(true);
      expect(matchesQuery("palestra", [presentActivity(byId("25_009")).keywords], [])).toBe(true);
   });
});
