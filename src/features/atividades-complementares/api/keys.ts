/**
 * Query key factory. Todas as chaves começam por `atividadesKeys.all`, o que permite
 * limpar o cache inteiro ao trocar perfil/cenário. O escopo da matrícula entra nas
 * chaves de dados do aluno.
 */
export const atividadesKeys = {
   all: ["atividades-complementares"] as const,
   student: () => [...atividadesKeys.all, "student"] as const,
   scoped: (studentId: string) => [...atividadesKeys.all, "aluno", studentId] as const,
   catalog: (studentId: string, catalogVersion: string) => [...atividadesKeys.scoped(studentId), "catalog", catalogVersion] as const,
   summary: (studentId: string) => [...atividadesKeys.scoped(studentId), "summary"] as const,
   budgets: (studentId: string, catalogVersion: string) => [...atividadesKeys.scoped(studentId), "budgets", catalogVersion] as const,
   requests: (studentId: string) => [...atividadesKeys.scoped(studentId), "requests"] as const,
   requestList: (studentId: string) => [...atividadesKeys.requests(studentId), "list"] as const,
   requestDetail: (studentId: string, id: string) => [...atividadesKeys.requests(studentId), "detail", id] as const,
   drafts: (studentId: string) => [...atividadesKeys.scoped(studentId), "drafts"] as const,
   draft: (studentId: string, id: string) => [...atividadesKeys.drafts(studentId), id] as const,
   attachment: (id: string) => [...atividadesKeys.all, "attachment", id] as const,
   demo: () => [...atividadesKeys.all, "demo"] as const,
};
