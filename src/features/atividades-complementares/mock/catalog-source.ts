/**
 * Catálogos do MOCK. Lê o JSON do briefing (38 linhas do anexo de 2025), o tipo
 * institucional 25_030 (só histórico) e os códigos legados observados no print 06.
 *
 * Nada aqui é ID oficial do backend. Tipos sem regra conhecida NÃO recebem limite,
 * documentos ou permissão de envio inventados.
 */
import { ActivityTypeSchema, type ActivityType } from "../types/catalog.schema";
import catalogo2025 from "./fixtures/catalogo-2025.json";

export const CATALOG_2025_VERSION = catalogo2025.normativeVersion;
export const LEGACY_CATALOG_VERSION = "LEGADO-MOCK";

export const catalog2025: ActivityType[] = catalogo2025.activities.map(item =>
   ActivityTypeSchema.parse({ ...item, historicalOnly: false }),
);

/** 25_030: visível no histórico (print 05), ausente do PDF. Sem teto nem envio manual. */
export const unknownInstitutionalTypes: ActivityType[] = catalogo2025.unknownInstitutionalTypes.map(item =>
   ActivityTypeSchema.parse({
      localId: item.localId,
      regulationCode: item.regulationCode,
      variant: null,
      systemCode: item.regulationCode,
      displayName: item.displayName,
      catalogVersion: CATALOG_2025_VERSION,
      budgetKey: `mock:2025:${item.localId}`,
      budgetSharingConfirmed: false,
      totalLimitMinutes: item.totalLimitMinutes,
      unitRule: null,
      documentRequirements: [],
      eligibility: [],
      exclusions: [],
      source: null,
      manualSubmission: item.manualSubmission,
      historicalOnly: true,
      provenanceNote: item.reason,
   }),
);

/**
 * Códigos históricos (print 06). Nomes e tetos observados; regra unitária e
 * documentos desconhecidos → não enviáveis, sem migração automática para 2025.
 */
const LEGACY_TYPES: { code: string; name: string; limitMinutes: number }[] = [
   {
      code: "18_021",
      name: "Estágios não obrigatórios relacionados à área de formação ou afins (catálogo anterior)",
      limitMinutes: 9600,
   },
   {
      code: "007",
      name: "Participação como ouvinte em congressos, palestras, minicursos, oficinas e similares (catálogo anterior)",
      limitMinutes: 3600,
   },
   {
      code: "18_007",
      name: "Participação como ouvinte em congressos, palestras, minicursos, oficinas e similares (catálogo anterior)",
      limitMinutes: 4800,
   },
   {
      code: "18_008",
      name: "Participação em cursos ou atividades culturais e artísticas (catálogo anterior)",
      limitMinutes: 3600,
   },
];

export const legacyCatalog: ActivityType[] = LEGACY_TYPES.map(item =>
   ActivityTypeSchema.parse({
      localId: item.code,
      regulationCode: item.code,
      variant: null,
      systemCode: item.code,
      displayName: item.name,
      catalogVersion: LEGACY_CATALOG_VERSION,
      budgetKey: `mock:legado:${item.code}`,
      budgetSharingConfirmed: false,
      totalLimitMinutes: item.limitMinutes,
      unitRule: null,
      documentRequirements: [],
      eligibility: ["catalogo_do_aluno"],
      exclusions: [],
      source: null,
      manualSubmission: false,
      historicalOnly: true,
      provenanceNote: "Código e limite observados no histórico do sistema atual. Regra completa não fornecida.",
   }),
);

export function catalogForVersion(version: string): { activities: ActivityType[]; historicalTypes: ActivityType[] } {
   if (version === CATALOG_2025_VERSION) return { activities: catalog2025, historicalTypes: unknownInstitutionalTypes };
   if (version === LEGACY_CATALOG_VERSION) return { activities: legacyCatalog, historicalTypes: [...unknownInstitutionalTypes] };
   return { activities: [], historicalTypes: unknownInstitutionalTypes };
}

/** Todos os tipos conhecidos, para nomear registros do histórico de qualquer versão. */
export const allKnownTypes: ActivityType[] = [...catalog2025, ...unknownInstitutionalTypes, ...legacyCatalog];
