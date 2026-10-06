/**
 * PONTO DE TROCA do adapter. Hoje só existe o mock assíncrono; o adapter real
 * (HTTP) deverá implementar `AtividadesGateway` com contratos revisados pelo TI
 * e ser selecionado aqui por `VITE_DATA_MODE=api`.
 */
import { env } from "@/config/env";
import type { AtividadesGateway, DemoControls } from "../types/gateway";
import { MockAtividadesGateway } from "../mock/mock-gateway";

let mockInstance: MockAtividadesGateway | null = null;

function mock(): MockAtividadesGateway {
   mockInstance ??= new MockAtividadesGateway();
   return mockInstance;
}

export class GatewayConfigurationError extends Error {
   constructor() {
      super("O adapter real ainda não existe. Use VITE_DATA_MODE=mock até o TI definir os contratos do backend.");
      this.name = "GatewayConfigurationError";
   }
}

export function getGateway(): AtividadesGateway {
   if (env.dataMode === "mock") return mock();
   throw new GatewayConfigurationError();
}

/** Controles de demonstração. `null` fora do modo mock. */
export function getDemoControls(): DemoControls | null {
   return env.dataMode === "mock" ? mock() : null;
}

export function isDemoToolsEnabled(): boolean {
   return env.dataMode === "mock" && env.demoTools;
}
