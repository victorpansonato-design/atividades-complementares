/**
 * Adapter MOCK assíncrono do gateway. Nenhuma chamada de rede, SSO ou cookie.
 *
 * - Respostas passam por Zod (mesmo contrato que o adapter real terá).
 * - Envio revalida saldo DEPOIS da latência e faz validação + reserva + gravação
 *   sem `await` intermediário. Resultado guardado por chave de idempotência.
 * - Concorrência entre abas não é garantida aqui; o backend real será a autoridade.
 */
import { CatalogSchema, type ActivityType, type Catalog } from "../types/catalog.schema";
import { BudgetSnapshotSchema, CourseSummarySchema, type Budget } from "../types/budget.schema";
import {
   ActivityRequestSchema,
   DraftListSchema,
   DraftSchema,
   RequestListSchema,
   type ActivityRequest,
   type Attachment,
   type Draft,
   type RequestVersion,
} from "../types/request.schema";
import { StudentContextSchema, type StudentContext } from "../types/student.schema";
import {
   GatewayError,
   type AtividadesGateway,
   type CorrectionReplyInput,
   type DemoControls,
   type DemoSimulationSettings,
   type DemoState,
   type MutationOptions,
   type ReconsiderationInput,
   type SaveDraftInput,
   type SimulatedDecision,
   type SubmitRequestInput,
} from "../types/gateway";
import { buildBudgets, computeCourseSummary, findBudget, reservedMinutesOf } from "../rules/budget";
import { checkAdmission, isIsoDate } from "../rules/dates";
import { LEGACY_DESCRIPTION_LIMIT } from "../rules/description";
import { fileExtension, isAcceptedExtension } from "../rules/files";
import { computeRequestLimits, evaluateActivity, type SelfReservation } from "../rules/limits";
import { evaluateCoverage, resolveRequirements } from "../rules/requirements";
import { correctionAvailability, reconsiderationAvailability } from "../rules/status";
import { bytesPersistence, clearBytes, deleteBytes, getBytes, putBytes } from "./attachment-bytes";
import { CATALOG_2025_VERSION, catalogForVersion } from "./catalog-source";
import { DEFAULT_SETTINGS, STORAGE_VERSION, clearState, readStoredState, saveState, seedState, type MockState } from "./mock-state";
import { DEFAULT_SCENARIO_ID, EXPIRED_DEADLINE_DATE, buildStudentContext, scenarioList } from "./seed";

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

function nowIso(): string {
   return new Date().toISOString();
}

function randomId(prefix: string): string {
   const uuid = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
   return `${prefix}-${uuid}`;
}

export class MockAtividadesGateway implements AtividadesGateway, DemoControls {
   private memoryState: MockState | null = null;

   /* --------------------------------------------------------------- */
   /* Estado                                                          */
   /* --------------------------------------------------------------- */

   private state(): MockState {
      // localStorage é a fonte (vê alterações de outra aba); memória cobre navegadores sem storage.
      const stored = readStoredState();
      if (stored) {
         this.memoryState = stored;
      } else if (!this.memoryState) {
         this.memoryState = seedState(DEFAULT_SCENARIO_ID);
         saveState(this.memoryState);
      }
      return this.memoryState;
   }

   private commit(state: MockState): void {
      state.revision += 1;
      this.memoryState = state;
      saveState(state);
   }

   private async latency(): Promise<void> {
      const ms = this.state().settings.latencyMs;
      if (ms > 0) await delay(ms);
   }

   private student(state: MockState): StudentContext {
      return buildStudentContext(state.scenarioId);
   }

   private catalog(student: StudentContext): Catalog {
      const { activities, historicalTypes } = catalogForVersion(student.catalogVersion);
      const submissionAvailable = student.catalogVersion === CATALOG_2025_VERSION;
      return {
         catalogVersion: student.catalogVersion,
         activities,
         historicalTypes,
         submissionAvailable,
         unavailableReason: submissionAvailable
            ? null
            : "As regras do catálogo da sua matriz não foram fornecidas para novos envios nesta demonstração. Os registros anteriores continuam válidos.",
      };
   }

   private allTypes(catalog: Catalog): ActivityType[] {
      return [...catalog.activities, ...catalog.historicalTypes];
   }

   private budgets(state: MockState, student: StudentContext, catalog: Catalog): Budget[] {
      return buildBudgets(state.requests, this.allTypes(catalog), student.policies);
   }

   /** Aplica sobrescritas de leitura (prazo vencido) e a reserva atual calculada. */
   private present(request: ActivityRequest, state: MockState, student: StudentContext): ActivityRequest {
      const expired = state.settings.expiredActionDeadlines && request.actionDeadlineDate != null;
      return ActivityRequestSchema.parse({
         ...request,
         actionDeadlineDate: expired ? EXPIRED_DEADLINE_DATE : request.actionDeadlineDate,
         deadlineIsMock: expired ? true : request.deadlineIsMock,
         reservedMinutes: reservedMinutesOf(request, student.policies),
      });
   }

   private findRequest(state: MockState, id: string): ActivityRequest {
      const request = state.requests.find(r => r.id === id);
      if (!request) throw new GatewayError("nao_encontrado", "Pedido não encontrado.");
      return request;
   }

   /* --------------------------------------------------------------- */
   /* Leitura                                                         */
   /* --------------------------------------------------------------- */

   async getStudentContext(): Promise<StudentContext> {
      await this.latency();
      return StudentContextSchema.parse(this.student(this.state()));
   }

   async listActivityTypes(): Promise<Catalog> {
      await this.latency();
      return CatalogSchema.parse(this.catalog(this.student(this.state())));
   }

   async getSummary() {
      await this.latency();
      const state = this.state();
      const student = this.student(state);
      return CourseSummarySchema.parse(computeCourseSummary(state.requests, student));
   }

   async getBudgets() {
      await this.latency();
      const state = this.state();
      const student = this.student(state);
      return BudgetSnapshotSchema.parse({
         revision: String(state.revision),
         items: this.budgets(state, student, this.catalog(student)),
      });
   }

   async listRequests(): Promise<ActivityRequest[]> {
      await this.latency();
      const state = this.state();
      if (state.settings.failRequestList) throw new GatewayError("falha_temporaria", "Falha simulada ao carregar pedidos.");
      const student = this.student(state);
      return RequestListSchema.parse(state.requests.map(r => this.present(r, state, student)));
   }

   async getRequest(id: string): Promise<ActivityRequest> {
      await this.latency();
      const state = this.state();
      const student = this.student(state);
      const request = this.present(this.findRequest(state, id), state, student);
      // Nunca indicar arquivo acessível que não existe mais neste dispositivo.
      const check = async (a: Attachment): Promise<Attachment> =>
         a.demoOnly ? { ...a, bytesAvailable: false } : { ...a, bytesAvailable: (await getBytes(a.id)) != null };
      return ActivityRequestSchema.parse({
         ...request,
         attachments: await Promise.all(request.attachments.map(check)),
         previousVersions: await Promise.all(
            request.previousVersions.map(async v => ({ ...v, attachments: await Promise.all(v.attachments.map(check)) })),
         ),
         reconsiderations: await Promise.all(
            request.reconsiderations.map(async r => ({ ...r, attachments: await Promise.all(r.attachments.map(check)) })),
         ),
      });
   }

   async listDrafts(): Promise<Draft[]> {
      await this.latency();
      return DraftListSchema.parse(this.state().drafts);
   }

   async getDraft(id: string): Promise<Draft> {
      await this.latency();
      const draft = this.state().drafts.find(d => d.id === id);
      if (!draft) throw new GatewayError("nao_encontrado", "Rascunho não encontrado.");
      return DraftSchema.parse(draft);
   }

   /* --------------------------------------------------------------- */
   /* Rascunhos (não reservam saldo)                                  */
   /* --------------------------------------------------------------- */

   async saveDraft(input: SaveDraftInput): Promise<Draft> {
      await this.latency();
      const state = this.state();
      const student = this.student(state);
      const now = nowIso();
      const existing = input.id ? state.drafts.find(d => d.id === input.id) : undefined;
      const draft: Draft = DraftSchema.parse({
         id: existing?.id ?? input.id ?? randomId("RASCUNHO"),
         activityLocalId: input.activityLocalId,
         catalogVersion: student.catalogVersion,
         title: input.title,
         values: input.values,
         createdAt: existing?.createdAt ?? now,
         updatedAt: now,
      });
      state.drafts = [draft, ...state.drafts.filter(d => d.id !== draft.id)];
      this.commit(state);
      return draft;
   }

   async deleteDraft(id: string): Promise<void> {
      await this.latency();
      const state = this.state();
      const draft = state.drafts.find(d => d.id === id);
      state.drafts = state.drafts.filter(d => d.id !== id);
      this.commit(state);
      const attachments = (draft?.values.attachments as { id?: string }[] | undefined) ?? [];
      await Promise.all(attachments.filter(a => a.id).map(a => deleteBytes(a.id!)));
   }

   /* --------------------------------------------------------------- */
   /* Validação comum de envio                                        */
   /* --------------------------------------------------------------- */

   private validateContent(
      state: MockState,
      student: StudentContext,
      catalog: Catalog,
      activity: ActivityType,
      input: Omit<SubmitRequestInput, "activityLocalId" | "catalogVersion" | "draftId">,
      self: SelfReservation | null,
      options: MutationOptions,
   ): void {
      if (!input.declarationAccepted) throw new GatewayError("estado_invalido", "Confirme a declaração de veracidade.");
      if (!input.title.trim()) throw new GatewayError("estado_invalido", "Informe o nome da atividade.");
      if (input.description.length > LEGACY_DESCRIPTION_LIMIT) {
         throw new GatewayError("estado_invalido", "A descrição ultrapassa 6.000 caracteres.");
      }
      if (!isIsoDate(input.startDate) || !isIsoDate(input.endDate) || input.endDate < input.startDate) {
         throw new GatewayError("estado_invalido", "Datas da atividade inválidas.");
      }
      if (!student.academicPeriods.some(p => p.id === input.academicPeriodId)) {
         throw new GatewayError("estado_invalido", "Período acadêmico inválido.");
      }
      if (
         student.policies.preAdmissionActivities === "block" &&
         checkAdmission(activity, student.admissionDate, input.startDate, input.endDate) === "before_admission"
      ) {
         throw new GatewayError("nao_elegivel", "Atividade anterior ao ingresso.");
      }
      for (const a of input.attachments) {
         if (!isAcceptedExtension(fileExtension(a.name))) throw new GatewayError("formato_invalido", `Formato não aceito: ${a.name}`);
      }

      const budgets = this.budgets(state, student, catalog);
      const limits = computeRequestLimits({
         activity,
         modeId: input.modeId,
         budget: findBudget(budgets, activity),
         periodId: input.academicPeriodId,
         certificateMinutes: input.certificateMinutes,
         self,
         policies: student.policies,
      });
      if (limits.needsMode || !limits.rule) throw new GatewayError("regra_indisponivel", "Regra do tipo indisponível.");
      if (limits.certificateUsage === "required" && input.certificateMinutes == null) {
         throw new GatewayError("estado_invalido", "Informe as horas do comprovante.");
      }
      const maximum = limits.maximum.maximumMinutes;
      if (maximum == null || input.requestedMinutes <= 0 || input.requestedMinutes > maximum) {
         throw new GatewayError("saldo_alterado", "O saldo disponível mudou.", {
            maximumMinutes: maximum ?? 0,
            revisionChanged: options.budgetRevision != null && options.budgetRevision !== String(state.revision),
         });
      }

      const requirements = resolveRequirements(activity, input.modeId);
      if (!requirements) throw new GatewayError("regra_indisponivel", "Escolha a modalidade da atividade.");
      const coverage = evaluateCoverage(requirements, input.attachments, student.institutionalRecords);
      if (!coverage.allCovered) throw new GatewayError("requisito_ausente", "Há documento exigido sem anexo.");
   }

   private failFirstAttempt(state: MockState, key: string): void {
      if (!state.settings.failFirstSubmitAttempt || state.failedAttemptKeys.includes(key)) return;
      state.failedAttemptKeys = [...state.failedAttemptKeys, key];
      saveState(state);
      throw new GatewayError("falha_temporaria", "Falha simulada de comunicação.");
   }

   private nextProtocol(state: MockState, student: StudentContext): string {
      state.protocolSeq += 1;
      return `MOCK-${student.referenceDate.slice(0, 4)}-${String(state.protocolSeq).padStart(5, "0")}`;
   }

   private snapshotAttachments(attachments: Attachment[], addedAt: string): Attachment[] {
      return attachments.map(a => ({ ...a, addedAt: a.addedAt ?? addedAt, bytesAvailable: !a.demoOnly && a.bytesAvailable }));
   }

   /* --------------------------------------------------------------- */
   /* Mutations                                                       */
   /* --------------------------------------------------------------- */

   async createRequest(input: SubmitRequestInput, options: MutationOptions): Promise<ActivityRequest> {
      await this.latency();
      // A partir daqui: síncrono até gravar (sem await entre validar, reservar e persistir).
      const state = this.state();
      const student = this.student(state);
      const existingId = state.idempotency[options.idempotencyKey];
      if (existingId) return this.present(this.findRequest(state, existingId), state, student);
      this.failFirstAttempt(state, options.idempotencyKey);

      const catalog = this.catalog(student);
      const activity = catalog.activities.find(a => a.localId === input.activityLocalId && a.catalogVersion === input.catalogVersion);
      if (!activity) throw new GatewayError("regra_indisponivel", "Tipo de atividade indisponível.");
      const budgets = this.budgets(state, student, catalog);
      const summary = computeCourseSummary(state.requests, student);
      const availability = evaluateActivity({
         activity,
         budget: findBudget(budgets, activity),
         student,
         catalog,
         courseComplete: summary.isComplete,
      });
      if (!availability.submittable) {
         if (availability.blockReason === "submission_closed") throw new GatewayError("prazo_encerrado", "Prazo de entrega encerrado.");
         if (availability.blockReason === "not_eligible") throw new GatewayError("nao_elegivel", "Tipo não disponível para o seu perfil.");
         if (availability.blockReason === "approved_limit_reached" || availability.blockReason === "reserved_in_review") {
            throw new GatewayError("saldo_alterado", "O saldo disponível mudou.", { maximumMinutes: 0 });
         }
         throw new GatewayError("regra_indisponivel", "Tipo de atividade indisponível para envio.", { reason: availability.blockReason });
      }
      this.validateContent(state, student, catalog, activity, input, null, options);

      const now = nowIso();
      const id = randomId("PEDIDO");
      const request: ActivityRequest = ActivityRequestSchema.parse({
         id,
         lineageId: id,
         activityLocalId: activity.localId,
         catalogVersion: activity.catalogVersion,
         status: "em_analise",
         origin: "manual",
         protocol: this.nextProtocol(state, student),
         title: input.title.trim(),
         organizer: input.organizer?.trim() || null,
         details: input.details?.trim() || null,
         description: input.description,
         academicPeriodId: input.academicPeriodId,
         startDate: input.startDate,
         endDate: input.endDate,
         modeId: input.modeId,
         certificateMinutes: input.certificateMinutes,
         requestedMinutes: input.requestedMinutes,
         approvedMinutes: null,
         attachments: this.snapshotAttachments(input.attachments, now),
         history: [{ event: "enviada", occurredAt: now, note: null }],
         submittedAt: now,
         updatedAt: now,
      });
      state.requests = [request, ...state.requests];
      state.idempotency[options.idempotencyKey] = id;
      if (input.draftId) state.drafts = state.drafts.filter(d => d.id !== input.draftId);
      this.commit(state);
      return this.present(request, state, student);
   }

   async replyToCorrection(requestId: string, input: CorrectionReplyInput, options: MutationOptions): Promise<ActivityRequest> {
      await this.latency();
      const state = this.state();
      const student = this.student(state);
      if (state.idempotency[options.idempotencyKey] === requestId) {
         return this.present(this.findRequest(state, requestId), state, student);
      }
      const current = this.findRequest(state, requestId);
      const presented = this.present(current, state, student);
      const availability = correctionAvailability(presented, student);
      if (!availability.allowed) {
         if (availability.reason === "deadline_expired") throw new GatewayError("prazo_encerrado", "O prazo para responder terminou.");
         throw new GatewayError("estado_invalido", "Este pedido não está aguardando correção.");
      }
      this.failFirstAttempt(state, options.idempotencyKey);
      const catalog = this.catalog(student);
      const activity = this.allTypes(catalog).find(
         a => a.localId === current.activityLocalId && a.catalogVersion === current.catalogVersion,
      );
      if (!activity) throw new GatewayError("regra_indisponivel", "Tipo de atividade indisponível.");
      // Exclui a própria reserva antes de validar o substituto: sem dupla reserva.
      const self: SelfReservation = { reservedMinutes: reservedMinutesOf(current, student.policies), periodId: current.academicPeriodId };
      this.validateContent(state, student, catalog, activity, input, self, options);

      const now = nowIso();
      const previous: RequestVersion = {
         version: current.currentVersion,
         submittedAt: current.submittedAt,
         title: current.title,
         organizer: current.organizer,
         details: current.details,
         description: current.description,
         academicPeriodId: current.academicPeriodId,
         startDate: current.startDate,
         endDate: current.endDate,
         modeId: current.modeId,
         certificateMinutes: current.certificateMinutes,
         requestedMinutes: current.requestedMinutes,
         attachments: current.attachments,
         correctionReason: current.correctionReason,
         studentResponse: input.studentResponse?.trim() || null,
      };
      const updated: ActivityRequest = ActivityRequestSchema.parse({
         ...current,
         title: input.title.trim(),
         organizer: input.organizer?.trim() || null,
         details: input.details?.trim() || null,
         description: input.description,
         academicPeriodId: input.academicPeriodId,
         startDate: input.startDate,
         endDate: input.endDate,
         modeId: input.modeId,
         certificateMinutes: input.certificateMinutes,
         requestedMinutes: input.requestedMinutes,
         attachments: this.snapshotAttachments(input.attachments, now),
         status: "em_analise",
         correctionReason: null,
         currentVersion: current.currentVersion + 1,
         previousVersions: [...current.previousVersions, previous],
         history: [...current.history, { event: "correcao_enviada", occurredAt: now, note: input.studentResponse?.trim() || null }],
         updatedAt: now,
      });
      state.requests = state.requests.map(r => (r.id === requestId ? updated : r));
      state.idempotency[options.idempotencyKey] = requestId;
      this.commit(state);
      return this.present(updated, state, student);
   }

   async requestReconsideration(requestId: string, input: ReconsiderationInput, options: MutationOptions): Promise<ActivityRequest> {
      await this.latency();
      const state = this.state();
      const student = this.student(state);
      if (state.idempotency[options.idempotencyKey] === requestId) {
         return this.present(this.findRequest(state, requestId), state, student);
      }
      const current = this.findRequest(state, requestId);
      const availability = reconsiderationAvailability(this.present(current, state, student), student);
      if (!availability.allowed) {
         if (availability.reason === "deadline_expired")
            throw new GatewayError("prazo_encerrado", "O prazo para pedir reconsideração terminou.");
         throw new GatewayError("estado_invalido", "Este pedido não aceita reconsideração agora.", { reason: availability.reason });
      }
      if (!input.declarationAccepted) throw new GatewayError("estado_invalido", "Confirme a declaração de veracidade.");
      if (!input.justification.trim()) throw new GatewayError("estado_invalido", "Escreva a justificativa.");
      if (student.policies.reconsiderationDocuments === "required" && input.attachments.length === 0) {
         throw new GatewayError("requisito_ausente", "Anexe ao menos um documento complementar.");
      }
      this.failFirstAttempt(state, options.idempotencyKey);

      const now = nowIso();
      const updated: ActivityRequest = ActivityRequestSchema.parse({
         ...current,
         status: "reconsideracao_em_analise",
         reconsiderations: [
            ...current.reconsiderations,
            {
               attempt: current.reconsiderations.length + 1,
               justification: input.justification.trim(),
               attachments: this.snapshotAttachments(input.attachments, now),
               submittedAt: now,
               status: "em_analise",
            },
         ],
         history: [...current.history, { event: "reconsideracao_enviada", occurredAt: now, note: null }],
         updatedAt: now,
      });
      state.requests = state.requests.map(r => (r.id === requestId ? updated : r));
      state.idempotency[options.idempotencyKey] = requestId;
      this.commit(state);
      return this.present(updated, state, student);
   }

   /* --------------------------------------------------------------- */
   /* Bytes de comprovantes                                           */
   /* --------------------------------------------------------------- */

   async getAttachment(attachmentId: string): Promise<Blob | null> {
      return getBytes(attachmentId);
   }

   async storeAttachment(attachmentId: string, file: Blob): Promise<{ persisted: boolean }> {
      return putBytes(attachmentId, file);
   }

   async discardAttachment(attachmentId: string): Promise<void> {
      // Não apaga bytes de anexos já enviados em pedidos (versões anteriores são preservadas).
      const state = this.state();
      const used = state.requests.some(
         r =>
            r.attachments.some(a => a.id === attachmentId) ||
            r.previousVersions.some(v => v.attachments.some(a => a.id === attachmentId)) ||
            r.reconsiderations.some(c => c.attachments.some(a => a.id === attachmentId)),
      );
      if (!used) await deleteBytes(attachmentId);
   }

   /* --------------------------------------------------------------- */
   /* Controles de demonstração                                       */
   /* --------------------------------------------------------------- */

   async getDemoState(): Promise<DemoState> {
      const state = this.state();
      return {
         scenarioId: state.scenarioId,
         scenarios: scenarioList,
         settings: state.settings,
         storageVersion: STORAGE_VERSION,
         bytesPersistence: await bytesPersistence(),
      };
   }

   async selectScenario(scenarioId: string): Promise<void> {
      const settings = this.state().settings;
      await clearBytes();
      const fresh = seedState(scenarioId, settings);
      this.memoryState = fresh;
      saveState(fresh);
   }

   async updateSettings(settings: Partial<DemoSimulationSettings>): Promise<void> {
      const state = this.state();
      state.settings = { ...state.settings, ...settings };
      this.commit(state);
   }

   async reset(): Promise<void> {
      const scenarioId = this.state().scenarioId;
      clearState();
      await clearBytes();
      const fresh = seedState(scenarioId, DEFAULT_SETTINGS);
      this.memoryState = fresh;
      saveState(fresh);
   }

   /** Decisão SEMPRE disparada por ação explícita no painel. Nunca por tempo ou abertura de tela. */
   async simulateDecision(requestId: string, decision: SimulatedDecision): Promise<ActivityRequest> {
      await this.latency();
      const state = this.state();
      const student = this.student(state);
      const current = this.findRequest(state, requestId);
      const inReconsideration = current.status === "reconsideracao_em_analise";
      if (current.status !== "em_analise" && !inReconsideration) {
         throw new GatewayError("estado_invalido", "Só é possível decidir pedidos em análise.");
      }
      const now = nowIso();
      const nextPeriodEnd = this.subsequentPeriodEnd(student);
      let updated: ActivityRequest;

      if (decision.kind === "aprovar") {
         const approved = Math.max(0, Math.min(decision.approvedMinutes, current.requestedMinutes ?? decision.approvedMinutes));
         updated = {
            ...current,
            status: "aprovada",
            approvedMinutes: approved,
            decisionReason: decision.reason?.trim() || null,
            actionDeadlineDate: null,
            history: [...current.history, { event: "aprovada", occurredAt: now, note: decision.reason?.trim() || null }],
         };
      } else if (decision.kind === "pedir_correcao") {
         if (inReconsideration) throw new GatewayError("estado_invalido", "Reconsideração não gera pendência nesta demonstração.");
         updated = {
            ...current,
            status: "precisa_correcao",
            correctionReason: decision.reason.trim(),
            actionDeadlineDate: decision.deadlineDate ?? nextPeriodEnd,
            deadlineIsMock: true,
            history: [...current.history, { event: "precisa_correcao", occurredAt: now, note: decision.reason.trim() }],
         };
      } else {
         updated = {
            ...current,
            status: "nao_aprovada",
            approvedMinutes: 0,
            decisionReason: decision.reason.trim(),
            actionDeadlineDate: inReconsideration ? current.actionDeadlineDate : (decision.deadlineDate ?? nextPeriodEnd),
            deadlineIsMock: true,
            history: [...current.history, { event: "nao_aprovada", occurredAt: now, note: decision.reason.trim() }],
         };
      }

      if (inReconsideration) {
         const attempts = [...updated.reconsiderations];
         const last = attempts.at(-1);
         if (last) {
            attempts[attempts.length - 1] = {
               ...last,
               status: decision.kind === "aprovar" ? "aprovada" : "nao_aprovada",
               decisionReason: decision.reason?.trim() || null,
               decidedAt: now,
            };
         }
         updated = { ...updated, reconsiderations: attempts };
      }

      updated = ActivityRequestSchema.parse({ ...updated, updatedAt: now });
      state.requests = state.requests.map(r => (r.id === requestId ? updated : r));
      this.commit(state);
      return this.present(updated, state, student);
   }

   /** "Até o semestre subsequente": fim do período seguinte ao atual (calendário MOCK). */
   private subsequentPeriodEnd(student: StudentContext): string | null {
      const periods = [...student.academicPeriods].sort((a, b) => a.startDate.localeCompare(b.startDate));
      const index = periods.findIndex(p => p.id === student.currentAcademicPeriodId);
      return periods[index + 1]?.endDate ?? null;
   }
}
