/**
 * Contrato de SESSÃO do shell (camada shared). A implementação deste protótipo é
 * um provider de aluno MOCKADO (ver `src/providers/mock-session-provider.tsx`):
 * nenhuma chamada a `/funcionarios/me`, `/logout`, SSO ou cookie real.
 *
 * A futura autenticação do aluno no portal deve fornecer este mesmo contrato.
 */
import { createContext } from "react";

export interface SessionUser {
   id: string;
   nome: string;
   /** Identificador exibido (RA). No mock é fictício. */
   identificador: string;
   /** Linha secundária (ex.: curso). */
   detalhe?: string | null;
}

export interface SessionContextData {
   user: SessionUser | null;
   isLoading: boolean;
   isError: boolean;
   isAuthenticated: boolean;
   /** `true` quando a sessão é simulada para demonstração. */
   isMock: boolean;
   retry: () => void;
}

export const SessionContext = createContext<SessionContextData | null>(null);
