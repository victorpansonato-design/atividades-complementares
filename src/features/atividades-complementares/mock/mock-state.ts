/**
 * Estado persistido da demonstração (localStorage, com versão). Guarda pedidos,
 * rascunhos, chaves de idempotência e ajustes de simulação. NUNCA guarda bytes
 * de arquivos (ver attachment-bytes.ts).
 */
import { z } from "zod";
import { ActivityRequestSchema, DraftSchema } from "../types/request.schema";
import type { DemoSimulationSettings } from "../types/gateway";
import { DEFAULT_SCENARIO_ID, buildSeedRequests, scenarioExists } from "./seed";

export const STORAGE_KEY = "atividades-complementares:demo-state";
export const STORAGE_VERSION = 1;

export const DEFAULT_SETTINGS: DemoSimulationSettings = {
   latencyMs: 350,
   failFirstSubmitAttempt: false,
   failRequestList: false,
   expiredActionDeadlines: false,
};

const MockStateSchema = z.object({
   version: z.literal(STORAGE_VERSION),
   scenarioId: z.string(),
   requests: z.array(ActivityRequestSchema),
   drafts: z.array(DraftSchema),
   /** chave de idempotência → id do pedido criado/atualizado. */
   idempotency: z.record(z.string(), z.string()),
   /** chaves cuja primeira tentativa já falhou (simulação de falha de envio). */
   failedAttemptKeys: z.array(z.string()),
   protocolSeq: z.number().int().nonnegative(),
   revision: z.number().int().nonnegative(),
   settings: z.object({
      latencyMs: z.number().int().nonnegative(),
      failFirstSubmitAttempt: z.boolean(),
      failRequestList: z.boolean(),
      expiredActionDeadlines: z.boolean(),
   }),
});
export type MockState = z.infer<typeof MockStateSchema>;

export function seedState(scenarioId: string, settings: DemoSimulationSettings = DEFAULT_SETTINGS): MockState {
   const id = scenarioExists(scenarioId) ? scenarioId : DEFAULT_SCENARIO_ID;
   return {
      version: STORAGE_VERSION,
      scenarioId: id,
      requests: buildSeedRequests(id),
      drafts: [],
      idempotency: {},
      failedAttemptKeys: [],
      protocolSeq: 0,
      revision: 0,
      settings: { ...settings },
   };
}

function storage(): Storage | null {
   try {
      return typeof localStorage === "undefined" ? null : localStorage;
   } catch {
      return null;
   }
}

/** Estado salvo e válido, ou `null` (ausente, versão antiga, JSON inválido ou storage indisponível). */
export function readStoredState(): MockState | null {
   try {
      const raw = storage()?.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = MockStateSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
   } catch {
      return null;
   }
}

export function saveState(state: MockState): void {
   try {
      storage()?.setItem(STORAGE_KEY, JSON.stringify(state));
   } catch {
      // cota/privado: a demonstração continua em memória nesta aba
   }
}

export function clearState(): void {
   try {
      storage()?.removeItem(STORAGE_KEY);
   } catch {
      // ignorado
   }
}
