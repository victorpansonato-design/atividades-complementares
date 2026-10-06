import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
   { step: 1, label: "Atividade" },
   { step: 2, label: "Dados e comprovante" },
   { step: 3, label: "Revisar e enviar" },
] as const;

/** "Passo 2 de 3 · Dados e comprovante" + barra segmentada: leve no celular, claro no desktop. */
export function WizardStepper({ current }: { current: 1 | 2 | 3 }) {
   const label = STEPS[current - 1]!.label;
   return (
      <nav aria-label="Etapas da solicitação" className="space-y-2">
         <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Passo {current} de 3</span> · {label}
         </p>
         <ol className="grid grid-cols-3 gap-1.5">
            {STEPS.map(({ step, label: stepLabel }) => (
               <li key={step} aria-current={step === current ? "step" : undefined}>
                  <span className={cn("block h-1.5 rounded-full", step <= current ? "bg-primary" : "bg-muted")} aria-hidden />
                  <span className="mt-1 hidden truncate text-xs text-muted-foreground sm:block" aria-hidden>
                     {step < current ? <Check className="mr-1 inline size-3 text-primary" aria-hidden /> : null}
                     {stepLabel}
                  </span>
                  <span className="sr-only">
                     {stepLabel}
                     {step < current ? " (concluída)" : step === current ? " (atual)" : ""}
                  </span>
               </li>
            ))}
         </ol>
      </nav>
   );
}

/**
 * Barra de ações fixa no rodapé da área de conteúdo. Fica no fluxo do documento
 * (sticky) e o contêiner de rolagem reserva espaço com `scroll-padding`, para não
 * cobrir campos nem mensagens.
 */
export function ActionBar({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
   return (
      <div className="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-border bg-canvas px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_12px_-6px_rgb(0_0_0/0.12)] md:-mx-8 md:px-8">
         {/* Uma linha também no celular: ação principal ocupa o espaço livre; secundárias ficam compactas. */}
         <div className="flex items-center gap-2">
            {aside ? <div className="flex shrink-0 items-center gap-2">{aside}</div> : null}
            <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none [&>*:last-child]:flex-1 sm:[&>*:last-child]:flex-none">
               {children}
            </div>
         </div>
      </div>
   );
}
