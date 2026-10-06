/**
 * Sessão de ALUNO MOCKADA para o protótipo. Substitui o AuthProvider do template
 * (que chamava `/funcionarios/me` e redirecionava ao SSO de funcionário).
 *
 * Funciona igual no `vite` e no build: não depende de `import.meta.env.DEV`.
 * Os dados vêm do gateway mock da feature (aluno fictício).
 */
import { SessionContext, type SessionContextData } from "@/contexts/session/session-context";
import { env } from "@/config/env";
import { useStudentContext } from "@/features/atividades-complementares";
import { useMemo, type ReactNode } from "react";

export function MockSessionProvider({ children }: { children: ReactNode }) {
   const { data: student, isLoading, isError, refetch } = useStudentContext();

   const value = useMemo<SessionContextData>(
      () => ({
         user: student ? { id: student.id, nome: student.name, identificador: student.ra, detalhe: student.course } : null,
         isLoading,
         isError,
         isAuthenticated: !!student,
         isMock: env.dataMode === "mock",
         retry: () => void refetch(),
      }),
      [student, isLoading, isError, refetch],
   );

   return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
