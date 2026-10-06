/**
 * Adapter mock: idempotência, falha + retry, rascunho sem reserva, correção sem
 * reserva dupla, reconsideração única, revalidação de saldo e isolamento de cenário.
 * Fronteira mockada: armazenamento do navegador (jsdom localStorage; sem IndexedDB → memória).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { MockAtividadesGateway } from "@/features/atividades-complementares/mock/mock-gateway";
import { STORAGE_KEY } from "@/features/atividades-complementares/mock/mock-state";
import type { SubmitRequestInput } from "@/features/atividades-complementares/types/gateway";
import { GatewayError } from "@/features/atividades-complementares/types/gateway";

const certificate = {
   id: "ANEXO-1",
   name: "certificado.pdf",
   extension: "pdf",
   mimeType: "application/pdf",
   sizeBytes: 100,
   requirementKeys: ["certificado"],
   demoOnly: false,
   bytesAvailable: true,
   addedAt: null,
};

function input(overrides: Partial<SubmitRequestInput> = {}): SubmitRequestInput {
   return {
      activityLocalId: "25_009",
      catalogVersion: "2025-03-26",
      modeId: null,
      title: "Palestra de teste",
      organizer: "UniAnchieta",
      details: null,
      description: "Atividade: Palestra de teste",
      academicPeriodId: "2026-2",
      startDate: "2026-09-10",
      endDate: "2026-09-10",
      certificateMinutes: 180,
      requestedMinutes: 120,
      attachments: [certificate],
      declarationAccepted: true,
      draftId: null,
      ...overrides,
   };
}

let gateway: MockAtividadesGateway;

beforeEach(async () => {
   localStorage.removeItem(STORAGE_KEY);
   gateway = new MockAtividadesGateway();
   await gateway.selectScenario("base");
   await gateway.updateSettings({ latencyMs: 0 });
});

const budgetOf = async (budgetKey: string) => (await gateway.getBudgets()).items.find(b => b.budgetKey === budgetKey)!;

describe("MockAtividadesGateway", () => {
   it("gera protocolo uma vez e não duplica com a mesma chave (duplo clique/retry)", async () => {
      const before = (await gateway.listRequests()).length;
      const [a, b] = await Promise.all([
         gateway.createRequest(input(), { idempotencyKey: "k1" }),
         gateway.createRequest(input(), { idempotencyKey: "k1" }),
      ]);
      expect(a.id).toBe(b.id);
      expect(a.protocol).toMatch(/^MOCK-2026-\d{5}$/);
      expect(a.status).toBe("em_analise");
      expect((await gateway.listRequests()).length).toBe(before + 1);
   });

   it("envio não altera aprovadas; só reserva", async () => {
      const summaryBefore = await gateway.getSummary();
      await gateway.createRequest(input(), { idempotencyKey: "k2" });
      const summaryAfter = await gateway.getSummary();
      expect(summaryAfter.approvedMinutes).toBe(summaryBefore.approvedMinutes);
      expect(summaryAfter.awaitingMinutes).toBe(summaryBefore.awaitingMinutes + 120);
   });

   it("primeira tentativa falha e o retry com a mesma chave cria um único pedido", async () => {
      await gateway.updateSettings({ failFirstSubmitAttempt: true });
      const before = (await gateway.listRequests()).length;
      await expect(gateway.createRequest(input(), { idempotencyKey: "k3" })).rejects.toMatchObject({ code: "falha_temporaria" });
      const ok = await gateway.createRequest(input(), { idempotencyKey: "k3" });
      expect(ok.status).toBe("em_analise");
      expect((await gateway.listRequests()).length).toBe(before + 1);
   });

   it("revalida o saldo no envio", async () => {
      // 25_012: limite 50h, 20h em análise → saldo 30h.
      const attempt = gateway.createRequest(
         input({
            activityLocalId: "25_012",
            certificateMinutes: 3000,
            requestedMinutes: 1860,
            attachments: [{ ...certificate, requirementKeys: ["certificado", "tempo"] }],
         }),
         { idempotencyKey: "k4" },
      );
      await expect(attempt).rejects.toMatchObject({ code: "saldo_alterado", details: { maximumMinutes: 1800 } });
   });

   it("exige os documentos do tipo", async () => {
      await expect(gateway.createRequest(input({ attachments: [] }), { idempotencyKey: "k5" })).rejects.toBeInstanceOf(GatewayError);
   });

   it("rascunho não reserva saldo e é removido no envio", async () => {
      const before = await budgetOf("mock:2025:25_009");
      const draft = await gateway.saveDraft({ id: null, activityLocalId: "25_009", title: "Rascunho", values: {} });
      expect(await budgetOf("mock:2025:25_009")).toEqual(before);
      await gateway.createRequest(input({ draftId: draft.id }), { idempotencyKey: "k6" });
      expect(await gateway.listDrafts()).toHaveLength(0);
   });

   it("correção mantém protocolo, guarda versão e não reserva duas vezes", async () => {
      const before = await budgetOf("mock:2025:25_016");
      expect(before.reservedMinutes).toBe(600);
      const replacement = {
         ...input({ activityLocalId: "25_016", certificateMinutes: 600, requestedMinutes: 600 }),
         studentResponse: "Anexei versão legível.",
      };
      const updated = await gateway.replyToCorrection("B07", replacement, { idempotencyKey: "c1" });
      expect(updated).toMatchObject({ protocol: "MOCK-B07", status: "em_analise", currentVersion: 2 });
      expect(updated.previousVersions[0]).toMatchObject({
         version: 1,
         correctionReason: "O comprovante está ilegível. Anexe uma versão legível.",
      });
      expect((await budgetOf("mock:2025:25_016")).reservedMinutes).toBe(600);
      // segunda resposta com a mesma chave não cria outra versão
      const again = await gateway.replyToCorrection("B07", replacement, { idempotencyKey: "c1" });
      expect(again.currentVersion).toBe(2);
      await expect(gateway.replyToCorrection("B07", replacement, { idempotencyKey: "c2" })).rejects.toMatchObject({
         code: "estado_invalido",
      });
   });

   it("correção pode usar o saldo liberado pela própria reserva (teto 100h)", async () => {
      const replacement = {
         ...input({ activityLocalId: "25_016", certificateMinutes: 6000, requestedMinutes: 6000 }),
         studentResponse: null,
      };
      const updated = await gateway.replyToCorrection("B07", replacement, { idempotencyKey: "c3" });
      expect(updated.requestedMinutes).toBe(6000);
   });

   it("reconsideração vinculada reserva uma vez e bloqueia tentativa paralela", async () => {
      const updated = await gateway.requestReconsideration(
         "B08",
         { justification: "Motivo detalhado da reconsideração.", attachments: [], declarationAccepted: true },
         { idempotencyKey: "r1" },
      );
      expect(updated).toMatchObject({ status: "reconsideracao_em_analise", protocol: "MOCK-B08" });
      expect(updated.reconsiderations).toHaveLength(1);
      expect((await budgetOf("mock:2025:25_025")).reservedMinutes).toBe(9600);
      await expect(
         gateway.requestReconsideration(
            "B08",
            { justification: "Outra tentativa.", attachments: [], declarationAccepted: true },
            { idempotencyKey: "r2" },
         ),
      ).rejects.toMatchObject({ code: "estado_invalido" });
   });

   it("prazo vencido bloqueia correção e reconsideração", async () => {
      await gateway.updateSettings({ expiredActionDeadlines: true });
      const replacement = {
         ...input({ activityLocalId: "25_016", requestedMinutes: 600, certificateMinutes: 600 }),
         studentResponse: null,
      };
      await expect(gateway.replyToCorrection("B07", replacement, { idempotencyKey: "e1" })).rejects.toMatchObject({
         code: "prazo_encerrado",
      });
      await expect(
         gateway.requestReconsideration(
            "B08",
            { justification: "Motivo detalhado.", attachments: [], declarationAccepted: true },
            { idempotencyKey: "e2" },
         ),
      ).rejects.toMatchObject({
         code: "prazo_encerrado",
      });
   });

   it("decisão simulada parcial conta só o computado e libera a diferença", async () => {
      const updated = await gateway.simulateDecision("B06", { kind: "aprovar", approvedMinutes: 300, reason: "Parcial" });
      expect(updated).toMatchObject({ status: "aprovada", approvedMinutes: 300, requestedMinutes: 1200 });
      expect(await budgetOf("mock:2025:25_012")).toMatchObject({ approvedMinutes: 300, reservedMinutes: 0, availableMinutes: 2700 });
      expect((await gateway.getSummary()).approvedMinutes).toBe(1560 + 300);
   });

   it("nada é aprovado sem ação explícita", async () => {
      const created = await gateway.createRequest(input(), { idempotencyKey: "k7" });
      expect((await gateway.getRequest(created.id)).status).toBe("em_analise");
   });

   it("registro automático não tem protocolo nem horas solicitadas", async () => {
      const auto = await gateway.getRequest("B02");
      expect(auto).toMatchObject({
         origin: "institutional",
         protocol: null,
         requestedMinutes: null,
         eventId: "EV-MOCK-B02",
         approvedMinutes: 300,
      });
   });

   it("anexo do seed é de demonstração, sem bytes", async () => {
      const b06 = await gateway.getRequest("B06");
      expect(b06.attachments[0]).toMatchObject({ demoOnly: true, bytesAvailable: false });
   });

   it("troca de cenário não mistura registros e reset restaura o fixture", async () => {
      await gateway.createRequest(input(), { idempotencyKey: "k8" });
      await gateway.selectScenario("vazio");
      expect(await gateway.listRequests()).toHaveLength(0);
      await gateway.selectScenario("base");
      await gateway.createRequest(input(), { idempotencyKey: "k9" });
      await gateway.reset();
      expect((await gateway.listRequests()).map(r => r.id).sort()).toEqual(["B01", "B02", "B03", "B04", "B05", "B06", "B07", "B08"]);
   });

   it("catálogo legado fica indisponível para envio, sem limites inventados", async () => {
      await gateway.selectScenario("historico_legado");
      const catalog = await gateway.listActivityTypes();
      expect(catalog.submissionAvailable).toBe(false);
      expect(catalog.activities.every(a => !a.manualSubmission)).toBe(true);
   });
});
