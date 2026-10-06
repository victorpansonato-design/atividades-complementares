/**
 * Leitura (React Query). Componentes usam estes hooks; nunca o gateway, JSON ou
 * localStorage diretamente. O gateway já devolve dados validados por Zod.
 */
import { useQuery } from "@tanstack/react-query";
import { atividadesKeys } from "./keys";
import { getDemoControls, getGateway } from "./gateway";

export function useStudentContext() {
   return useQuery({
      queryKey: atividadesKeys.student(),
      queryFn: () => getGateway().getStudentContext(),
   });
}

export function useCatalog() {
   const { data: student } = useStudentContext();
   return useQuery({
      queryKey: atividadesKeys.catalog(student?.id ?? "", student?.catalogVersion ?? ""),
      queryFn: () => getGateway().listActivityTypes(),
      enabled: !!student,
   });
}

export function useSummary() {
   const { data: student } = useStudentContext();
   return useQuery({
      queryKey: atividadesKeys.summary(student?.id ?? ""),
      queryFn: () => getGateway().getSummary(),
      enabled: !!student,
   });
}

export function useBudgets() {
   const { data: student } = useStudentContext();
   return useQuery({
      queryKey: atividadesKeys.budgets(student?.id ?? "", student?.catalogVersion ?? ""),
      queryFn: () => getGateway().getBudgets(),
      enabled: !!student,
   });
}

export function useRequests() {
   const { data: student } = useStudentContext();
   return useQuery({
      queryKey: atividadesKeys.requestList(student?.id ?? ""),
      queryFn: () => getGateway().listRequests(),
      enabled: !!student,
      retry: false,
   });
}

export function useRequest(id: string) {
   const { data: student } = useStudentContext();
   return useQuery({
      queryKey: atividadesKeys.requestDetail(student?.id ?? "", id),
      queryFn: () => getGateway().getRequest(id),
      enabled: !!student && id.length > 0,
      retry: false,
   });
}

export function useDrafts() {
   const { data: student } = useStudentContext();
   return useQuery({
      queryKey: atividadesKeys.drafts(student?.id ?? ""),
      queryFn: () => getGateway().listDrafts(),
      enabled: !!student,
   });
}

export function useDraft(id: string | null) {
   const { data: student } = useStudentContext();
   return useQuery({
      queryKey: atividadesKeys.draft(student?.id ?? "", id ?? ""),
      queryFn: () => getGateway().getDraft(id!),
      enabled: !!student && !!id,
      retry: false,
      // Rascunho é carregado uma vez para preencher o formulário.
      staleTime: Infinity,
   });
}

/** Bytes do comprovante (somente quando o aluno pede para ver/baixar). */
export function useAttachmentBlob(attachmentId: string | null) {
   return useQuery({
      queryKey: atividadesKeys.attachment(attachmentId ?? ""),
      queryFn: () => getGateway().getAttachment(attachmentId!),
      enabled: !!attachmentId,
      staleTime: 0,
      gcTime: 0,
   });
}

export function useDemoState() {
   const controls = getDemoControls();
   return useQuery({
      queryKey: atividadesKeys.demo(),
      queryFn: () => controls!.getDemoState(),
      enabled: !!controls,
   });
}
