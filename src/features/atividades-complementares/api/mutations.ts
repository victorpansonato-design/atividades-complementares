/**
 * Escrita (React Query). Toda mutation invalida resumo, saldos, listagem, rascunhos
 * e detalhe afetados. Sem retry automático: o aluno decide tentar de novo, e o
 * retry reutiliza a mesma chave de idempotência.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
   CorrectionReplyInput,
   DemoSimulationSettings,
   MutationOptions,
   ReconsiderationInput,
   SaveDraftInput,
   SimulatedDecision,
   SubmitRequestInput,
} from "../types/gateway";
import type { ActivityRequest } from "../types/request.schema";
import { atividadesKeys } from "./keys";
import { getDemoControls, getGateway } from "./gateway";
import { useStudentContext } from "./queries";

/**
 * Invalida sem bloquear: se a mutation esperasse o refetch, a tela poderia
 * re-renderizar com o novo estado (ex.: pedido saiu de "precisa de correção")
 * e desmontar o formulário antes do callback de sucesso da chamada.
 */
function useInvalidateStudentData() {
   const queryClient = useQueryClient();
   const { data: student } = useStudentContext();
   return async (request?: ActivityRequest) => {
      if (!student) return;
      if (request) queryClient.setQueryData(atividadesKeys.requestDetail(student.id, request.id), request);
      await queryClient.invalidateQueries({ queryKey: atividadesKeys.scoped(student.id) });
   };
}

export function useCreateRequest() {
   const invalidate = useInvalidateStudentData();
   return useMutation({
      mutationFn: ({ input, options }: { input: SubmitRequestInput; options: MutationOptions }) =>
         getGateway().createRequest(input, options),
      retry: false,
      onSettled: request => void invalidate(request ?? undefined),
   });
}

export function useReplyToCorrection(requestId: string) {
   const invalidate = useInvalidateStudentData();
   return useMutation({
      mutationFn: ({ input, options }: { input: CorrectionReplyInput; options: MutationOptions }) =>
         getGateway().replyToCorrection(requestId, input, options),
      retry: false,
      onSettled: request => void invalidate(request ?? undefined),
   });
}

export function useRequestReconsideration(requestId: string) {
   const invalidate = useInvalidateStudentData();
   return useMutation({
      mutationFn: ({ input, options }: { input: ReconsiderationInput; options: MutationOptions }) =>
         getGateway().requestReconsideration(requestId, input, options),
      retry: false,
      onSettled: request => void invalidate(request ?? undefined),
   });
}

export function useSaveDraft() {
   const invalidate = useInvalidateStudentData();
   return useMutation({
      mutationFn: (input: SaveDraftInput) => getGateway().saveDraft(input),
      retry: false,
      onSuccess: () => void invalidate(),
   });
}

export function useDeleteDraft() {
   const invalidate = useInvalidateStudentData();
   return useMutation({
      mutationFn: (id: string) => getGateway().deleteDraft(id),
      retry: false,
      onSuccess: () => void invalidate(),
   });
}

/* ------------------------------------------------------------------ */
/* Demonstração                                                        */
/* ------------------------------------------------------------------ */

function useResetAllData() {
   const queryClient = useQueryClient();
   return async () => {
      // Troca de perfil/cenário: nada do cache anterior pode se misturar.
      await queryClient.cancelQueries({ queryKey: atividadesKeys.all });
      queryClient.removeQueries({ queryKey: atividadesKeys.all });
      await queryClient.invalidateQueries({ queryKey: atividadesKeys.all });
   };
}

export function useSelectScenario() {
   const resetAll = useResetAllData();
   return useMutation({
      mutationFn: (scenarioId: string) => getDemoControls()!.selectScenario(scenarioId),
      onSuccess: () => resetAll(),
   });
}

export function useResetDemo() {
   const resetAll = useResetAllData();
   return useMutation({
      mutationFn: () => getDemoControls()!.reset(),
      onSuccess: () => resetAll(),
   });
}

export function useUpdateDemoSettings() {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: (settings: Partial<DemoSimulationSettings>) => getDemoControls()!.updateSettings(settings),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: atividadesKeys.all }),
   });
}

export function useSimulateDecision() {
   const invalidate = useInvalidateStudentData();
   return useMutation({
      mutationFn: ({ requestId, decision }: { requestId: string; decision: SimulatedDecision }) =>
         getDemoControls()!.simulateDecision(requestId, decision),
      onSuccess: request => void invalidate(request),
   });
}
