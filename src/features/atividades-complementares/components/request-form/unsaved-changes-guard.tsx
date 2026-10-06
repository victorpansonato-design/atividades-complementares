import { useEffect } from "react";
import { useBlocker } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface UnsavedChangesGuardProps {
   when: boolean;
   /** Salvar rascunho antes de sair (quando disponível). Deve rejeitar em caso de erro. */
   onSaveDraft?: () => Promise<void>;
   saving?: boolean;
}

/**
 * Confirma a saída com alterações não salvas. Voltar entre passos (mesma rota)
 * não pede confirmação. Recarregar/fechar a aba usa o aviso nativo do navegador.
 */
export function UnsavedChangesGuard({ when, onSaveDraft, saving }: UnsavedChangesGuardProps) {
   const blocker = useBlocker(({ currentLocation, nextLocation }) => when && currentLocation.pathname !== nextLocation.pathname);

   useEffect(() => {
      if (!when) return;
      const handler = (event: BeforeUnloadEvent) => {
         event.preventDefault();
      };
      window.addEventListener("beforeunload", handler);
      return () => window.removeEventListener("beforeunload", handler);
   }, [when]);

   const open = blocker.state === "blocked";

   return (
      <Dialog open={open} onOpenChange={next => !next && blocker.reset?.()}>
         <DialogContent>
            <DialogHeader>
               <DialogTitle>Sair sem enviar?</DialogTitle>
               <DialogDescription>
                  As informações preenchidas ainda não foram enviadas.{" "}
                  {onSaveDraft ? "Você pode salvar um rascunho neste dispositivo." : "Elas serão perdidas."}
               </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
               <Button variant="outline" className="h-11" onClick={() => blocker.reset?.()}>
                  Continuar preenchendo
               </Button>
               {onSaveDraft ? (
                  <Button
                     variant="secondary"
                     className="h-11"
                     disabled={saving}
                     onClick={async () => {
                        try {
                           await onSaveDraft();
                           blocker.proceed?.();
                        } catch {
                           blocker.reset?.();
                        }
                     }}
                  >
                     Salvar rascunho e sair
                  </Button>
               ) : null}
               <Button variant="destructive" className="h-11" onClick={() => blocker.proceed?.()}>
                  Sair sem salvar
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
