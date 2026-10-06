import { AlertCircle, Loader2 } from "lucide-react";
import { Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { env } from "@/config/env";
import { useSession } from "@/hooks/use-session";

/**
 * Exige sessão para o módulo. No protótipo a sessão é mockada: não há redirect
 * para SSO. Em erro, explica e permite tentar de novo.
 */
export default function SessionGate() {
   const { isLoading, isError, isAuthenticated, retry } = useSession();

   if (isLoading) {
      return (
         <div className="flex h-svh items-center justify-center" role="status" aria-live="polite">
            <Loader2 className="size-8 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden />
            <span className="sr-only">Carregando…</span>
         </div>
      );
   }

   if (isError || !isAuthenticated) {
      return (
         <div className="mx-auto flex h-svh max-w-lg items-center px-4">
            <EmptyState
               tone="error"
               icon={AlertCircle}
               title="Não foi possível carregar sua sessão."
               hint={
                  env.dataMode === "mock"
                     ? "Tente novamente. Se o problema continuar, restaure os dados de demonstração."
                     : "O adapter de dados real ainda não existe neste protótipo. Use VITE_DATA_MODE=mock."
               }
               actions={
                  <Button variant="outline" className="h-11" onClick={retry}>
                     Tentar novamente
                  </Button>
               }
            />
         </div>
      );
   }

   return <Outlet />;
}
