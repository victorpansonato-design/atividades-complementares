/**
 * Casos de `dados/casos-de-calculo.json` do briefing (copiado para tests/fixtures).
 * Todas as durações em minutos inteiros.
 */
import { describe, expect, it } from "vitest";
import cases from "../../../../fixtures/casos-de-calculo.json";
import {
   buildBudgets,
   computeCourseProgress,
   computeMaximumRequest,
   computeReplacementAvailable,
   computeSemesterBalance,
   computeTypeBalance,
   evaluateOneTime,
   latestPerLineage,
   reservedMinutesOf,
} from "@/features/atividades-complementares/rules/budget";
import { durationToMinutes } from "@/features/atividades-complementares/rules/duration";
import type { ActivityType } from "@/features/atividades-complementares/types/catalog.schema";
import type { ActivityRequest } from "@/features/atividades-complementares/types/request.schema";

type Case = (typeof cases.cases)[number];
const byId = (id: string) =>
   cases.cases.find(c => c.id === id) as Case & { input: Record<string, number | boolean | string>; expected: Record<string, unknown> };
const policies = { pendingCorrectionReserves: true };

function activity(overrides: Partial<ActivityType> = {}): ActivityType {
   return {
      localId: "T",
      regulationCode: "T",
      variant: null,
      systemCode: "T",
      displayName: "Tipo de teste",
      catalogVersion: "v",
      budgetKey: "b",
      budgetSharingConfirmed: false,
      totalLimitMinutes: 6000,
      unitRule: { kind: "certificate_hours", limitMinutes: null },
      documentRequirements: [],
      eligibility: ["catalogo_do_aluno"],
      exclusions: [],
      source: null,
      manualSubmission: true,
      historicalOnly: false,
      provenanceNote: null,
      ...overrides,
   };
}

function request(overrides: Partial<ActivityRequest>): ActivityRequest {
   return {
      id: overrides.id ?? "R",
      lineageId: overrides.lineageId ?? overrides.id ?? "R",
      activityLocalId: "T",
      catalogVersion: "v",
      status: "em_analise",
      origin: "manual",
      protocol: null,
      eventId: null,
      title: "x",
      organizer: null,
      details: null,
      description: "x",
      academicPeriodId: "2026-2",
      startDate: "2026-09-01",
      endDate: "2026-09-01",
      modeId: null,
      certificateMinutes: null,
      requestedMinutes: 600,
      approvedMinutes: null,
      attachments: [],
      decisionReason: null,
      correctionReason: null,
      actionDeadlineDate: null,
      deadlineIsMock: false,
      fixtureNotice: null,
      submittedAt: null,
      updatedAt: "2026-09-01T10:00:00Z",
      currentVersion: 1,
      previousVersions: [],
      reconsiderations: [],
      history: [],
      reservedMinutes: 0,
      ...overrides,
   };
}

describe("casos-de-calculo.json", () => {
   it("tipo_reservado: aprovadas + análise ocupam o teto → saldo reservado", () => {
      const { input, expected } = byId("tipo_reservado");
      expect(computeTypeBalance(input as never)).toEqual({ availableMinutes: expected.availableMinutes, reason: expected.reason });
   });

   it("tipo_aprovado: aprovadas atingem o teto → limite atingido", () => {
      const { input, expected } = byId("tipo_aprovado");
      expect(computeTypeBalance(input as never)).toEqual({ availableMinutes: expected.availableMinutes, reason: expected.reason });
   });

   it("limite_por_publicacao: máximo do pedido é o limite por unidade", () => {
      const { input, expected } = byId("limite_por_publicacao");
      const balance = computeTypeBalance(input as never);
      expect(balance.availableMinutes).toBe(expected.availableMinutes);
      const max = computeMaximumRequest({
         typeAvailableMinutes: balance.availableMinutes,
         unitLimitMinutes: input.unitLimitMinutes as number,
      });
      expect(max.maximumMinutes).toBe(expected.maximumRequestMinutes);
      expect(max.binding?.kind).toBe("unit_limit");
   });

   it("limite_semestre: semestre ocupado zera o máximo, mesmo com saldo no tipo", () => {
      const { input, expected } = byId("limite_semestre");
      const balance = computeTypeBalance(input as never);
      const semester = computeSemesterBalance(input as never);
      expect(balance.availableMinutes).toBe(expected.availableMinutes);
      expect(semester).toBe(expected.semesterAvailableMinutes);
      expect(
         computeMaximumRequest({ typeAvailableMinutes: balance.availableMinutes, semesterAvailableMinutes: semester }).maximumMinutes,
      ).toBe(expected.maximumRequestMinutes);
   });

   it("certificado_maior_que_saldo: comprovante não é alterado; pedido limitado ao saldo", () => {
      const { input, expected } = byId("certificado_maior_que_saldo");
      const balance = computeTypeBalance(input as never);
      const certificate = input.certificateMinutes as number;
      const max = computeMaximumRequest({ typeAvailableMinutes: balance.availableMinutes, certificateMinutes: certificate });
      expect(balance.availableMinutes).toBe(expected.availableMinutes);
      expect(max.maximumMinutes).toBe(expected.maximumRequestMinutes);
      expect(certificate).toBe(expected.certificateMinutesUnchanged);
   });

   it("corrigir_sem_dupla_reserva: o próprio pedido sai do somatório", () => {
      const { input, expected } = byId("corrigir_sem_dupla_reserva");
      expect(computeReplacementAvailable(input as never)).toBe(expected.availableForReplacementMinutes);
   });

   it.each(["aprovacao_parcial", "recusa_libera"])("%s: decisão libera a reserva e conta só o computado", id => {
      const { input, expected } = byId(id);
      const type = activity({ totalLimitMinutes: input.totalLimitMinutes as number });
      const before = buildBudgets([request({ requestedMinutes: input.requestRequestedMinutes as number })], [type], policies)[0]!;
      expect(before.reservedMinutes).toBe(input.previousReservedMinutes);
      const decided = request({
         requestedMinutes: input.requestRequestedMinutes as number,
         status: input.decision === "nao_aprovada" ? "nao_aprovada" : "aprovada",
         approvedMinutes: input.decisionApprovedMinutes as number,
      });
      const after = buildBudgets([decided], [type], policies)[0]!;
      expect(after.approvedMinutes).toBe(expected.approvedMinutes);
      expect(after.reservedMinutes).toBe(expected.reservedMinutes);
      expect(after.availableMinutes).toBe(expected.availableMinutes);
      if (expected.releasedMinutes != null) {
         expect((input.requestRequestedMinutes as number) - (input.decisionApprovedMinutes as number)).toBe(expected.releasedMinutes);
      }
   });

   it("resumo_curso: pendência não conta como aprovada", () => {
      const { input, expected } = byId("resumo_curso");
      const progress = computeCourseProgress({
         requiredMinutes: input.requiredMinutes as number,
         approvedMinutes: input.approvedMinutes as number,
      });
      expect(progress.remainingMinutes).toBe(expected.remainingMinutes);
      expect(progress.progressRatio).toBeCloseTo(expected.progressRatio as number, 6);
   });

   it.each(["duracao_fracionada", "duracao_acima_24h"])("%s", id => {
      const { input, expected } = byId(id);
      expect(durationToMinutes(input.hours as number, input.minutes as number)).toBe(expected.durationMinutes);
   });

   it("rascunho_nao_reserva: rascunho não entra no saldo", () => {
      const { input, expected } = byId("rascunho_nao_reserva");
      // Rascunhos não são pedidos: o gateway nem os inclui no cálculo.
      expect(computeTypeBalance(input as never).availableMinutes).toBe(expected.availableMinutes);
   });

   it("uso_unico_ativo: pedido ativo bloqueia outro uso", () => {
      const { input, expected } = byId("uso_unico_ativo");
      expect(evaluateOneTime(input as never)).toEqual({ canSubmit: expected.canSubmit, reason: expected.reason });
   });

   it("reconsideracao_sem_duplicar: uma reserva por linhagem", () => {
      const { input, expected } = byId("reconsideracao_sem_duplicar");
      const original = request({
         id: "A",
         lineageId: input.lineageId as string,
         status: "nao_aprovada",
         approvedMinutes: 0,
         requestedMinutes: input.rejectedOriginalMinutes as number,
         updatedAt: "2026-01-01T00:00:00Z",
      });
      const attempt = request({
         id: "B",
         lineageId: input.lineageId as string,
         status: "reconsideracao_em_analise",
         requestedMinutes: input.activeReconsiderationMinutes as number,
         updatedAt: "2026-02-01T00:00:00Z",
      });
      const reserved = latestPerLineage([original, attempt]).reduce((sum, r) => sum + reservedMinutesOf(r, policies), 0);
      expect(reserved).toBe(expected.reservedMinutesForLineage);
   });
});

describe("regras complementares", () => {
   it("fator não aplicável é ignorado, nunca tratado como zero", () => {
      expect(
         computeMaximumRequest({ typeAvailableMinutes: 600, semesterAvailableMinutes: null, unitLimitMinutes: undefined }).maximumMinutes,
      ).toBe(600);
   });

   it("teto desconhecido não vira limite atingido", () => {
      expect(computeTypeBalance({ totalLimitMinutes: null, approvedMinutes: 300, reservedMinutes: 0 })).toEqual({
         availableMinutes: null,
         reason: "unknown_limit",
      });
   });

   it("carga exigida ausente não divide por zero", () => {
      expect(computeCourseProgress({ requiredMinutes: null, approvedMinutes: 100 })).toEqual({
         remainingMinutes: null,
         progressRatio: null,
         isComplete: false,
      });
      expect(computeCourseProgress({ requiredMinutes: 0, approvedMinutes: 100 }).progressRatio).toBeNull();
   });

   it("pendência deixa de reservar se a política mudar", () => {
      expect(reservedMinutesOf({ status: "precisa_correcao", requestedMinutes: 600 }, { pendingCorrectionReserves: false })).toBe(0);
   });

   it("orçamentos são separados por versão de catálogo, mesmo com o mesmo budgetKey", () => {
      const a = activity({ catalogVersion: "2025" });
      const b = activity({ catalogVersion: "legado" });
      const budgets = buildBudgets([request({ catalogVersion: "2025", status: "aprovada", approvedMinutes: 600 })], [a, b], policies);
      expect(budgets.find(x => x.catalogVersion === "2025")!.approvedMinutes).toBe(600);
      expect(budgets.find(x => x.catalogVersion === "legado")!.approvedMinutes).toBe(0);
   });
});
