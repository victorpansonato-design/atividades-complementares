/**
 * Converte o fixture `perfis-e-solicitacoes.mock.json` (dados FICTÍCIOS) em estado
 * do mock. Cada cenário é isolado: registros de presets diferentes não se misturam.
 * Não acrescenta eventos de histórico que o fixture não traz.
 */
import { ActivityRequestSchema, type ActivityRequest } from "../types/request.schema";
import { PoliciesSchema, StudentContextSchema, type StudentContext } from "../types/student.schema";
import { fileExtension } from "../rules/files";
import fixture from "./fixtures/perfis-e-solicitacoes.mock.json";

export const FIXTURE_REFERENCE_DATE = fixture.asOfDate;
export const FIXTURE_TIME_ZONE = fixture.timeZone;
export const DEFAULT_SCENARIO_ID = "base";

/** Data vencida usada pelo cenário "expired_deadline" (relativa a 2026-10-05). */
export const EXPIRED_DEADLINE_DATE = "2026-09-30";

type FixtureScenario = (typeof fixture.scenarios)[number];
type FixtureRequest = FixtureScenario["requests"][number];

export const scenarioList = fixture.scenarios.map(s => ({ id: s.id, label: s.label }));

function findScenario(id: string): FixtureScenario {
   return fixture.scenarios.find(s => s.id === id) ?? fixture.scenarios.find(s => s.id === DEFAULT_SCENARIO_ID)!;
}

export function scenarioExists(id: string): boolean {
   return fixture.scenarios.some(s => s.id === id);
}

export function buildStudentContext(scenarioId: string): StudentContext {
   const scenario = findScenario(scenarioId);
   const overrides = scenario.studentOverrides as Partial<Record<string, unknown>>;
   return StudentContextSchema.parse({
      ...fixture.defaultStudent,
      submissionDeadlineDate: null,
      deadlineIsMock: false,
      ...overrides,
      // Representante de classe: requisito cumprido por cadastro do coordenador (estado simulado).
      institutionalRecords: { cadastro: "confirmed" },
      referenceDate: fixture.asOfDate,
      timeZone: fixture.timeZone,
      policies: PoliciesSchema.parse(fixture.policies),
      scenarioId: scenario.id,
   });
}

function normalizeRequest(raw: FixtureRequest): ActivityRequest {
   const item = raw as FixtureRequest & Record<string, unknown>;
   const history = item.history.map(h => ({ event: h.event, occurredAt: h.occurredAt, note: null }));
   const lastEvent = history.at(-1)?.occurredAt ?? `${item.endDate}T12:00:00-03:00`;
   const decided = item.status === "aprovada" || item.status === "nao_aprovada";
   return ActivityRequestSchema.parse({
      ...item,
      organizer: null,
      details: null,
      certificateMinutes: (item.certificateMinutes as number | undefined) ?? null,
      approvedMinutes: decided ? item.approvedMinutes : null,
      attachments: item.attachments.map(a => ({
         ...a,
         extension: fileExtension(a.name) || null,
         mimeType: null,
         sizeBytes: null,
         addedAt: null,
      })),
      history,
      protocol: (item.protocol as string | undefined) ?? null,
      eventId: (item.eventId as string | undefined) ?? null,
      decisionReason: (item.decisionReason as string | undefined) ?? null,
      correctionReason: (item.correctionReason as string | undefined) ?? null,
      actionDeadlineDate: (item.actionDeadlineDate as string | undefined) ?? null,
      deadlineIsMock: (item.deadlineIsMock as boolean | undefined) ?? false,
      fixtureNotice: (item.fixtureNotice as string | undefined) ?? null,
      // O fixture não informa a data de envio: não inventar (o histórico mostra os eventos reais).
      submittedAt: null,
      updatedAt: lastEvent,
      reservedMinutes: 0,
   });
}

export function buildSeedRequests(scenarioId: string): ActivityRequest[] {
   return findScenario(scenarioId).requests.map(normalizeRequest);
}
