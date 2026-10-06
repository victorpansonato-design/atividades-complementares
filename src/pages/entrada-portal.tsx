import { ArrowRight, ChevronRight, ExternalLink, FlaskConical } from "lucide-react";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMinutes, RegulationLink, useSummary } from "@/features/atividades-complementares";
import { cn } from "@/lib/utils";

/**
 * ENTRADA LOCAL DE DEMONSTRAÇÃO. Representa o contexto "Meu perfil / Horas
 * Complementares" do novo portal (print 01) e o botão "Solicitar horas", que leva
 * direto ao passo 1 do formulário. Não reproduz o portal nem cria links globais.
 */
export default function EntradaPortalPage() {
   const summary = useSummary();
   const data = summary.data;
   const percent = data?.progressRatio != null ? Math.round(data.progressRatio * 100) : null;

   return (
      <div className="min-h-svh bg-shell text-foreground">
         <div className="border-b border-warning/40 bg-warning-soft px-4 py-2 text-xs text-warning-foreground">
            <p className="mx-auto flex max-w-5xl items-center gap-2">
               <FlaskConical className="size-3.5 shrink-0" aria-hidden />
               Entrada local de demonstração: representa o botão do novo portal. Não é o portal e não substitui sua navegação.
            </p>
         </div>

         <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
            <p className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground" aria-label="Contexto no portal">
               <span>Meu perfil</span>
               <ChevronRight className="size-3.5" aria-hidden />
               <span className="font-medium text-foreground">Horas Complementares</span>
            </p>

            <section
               aria-labelledby="horas-titulo"
               className="space-y-6 rounded-xl border border-border bg-canvas p-5 shadow-elevated sm:p-8"
            >
               <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                     <h1 id="horas-titulo" className="font-display text-[22px] font-medium leading-tight">
                        Horas complementares
                     </h1>
                     <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                        Acompanhe o que já foi validado pela coordenação, consulte o regulamento e solicite o registro de novas atividades.
                     </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                     <RegulationLink label="Visualizar regulamento" />
                     <Link to="/solicitar" className={cn(buttonVariants({ size: "lg" }), "gap-2 px-6")}>
                        <ExternalLink className="size-4" aria-hidden /> Solicitar horas
                     </Link>
                  </div>
               </div>

               {summary.isLoading ? (
                  <Skeleton className="h-16 w-full" />
               ) : data && data.requiredMinutes != null && percent != null ? (
                  <div className="space-y-2">
                     <p className="text-sm">
                        <strong className="font-display text-2xl font-medium tabular">{percent}%</strong>{" "}
                        <span className="text-muted-foreground">
                           {formatMinutes(data.approvedMinutes)} aprovadas de {formatMinutes(data.requiredMinutes)} · faltam{" "}
                           {formatMinutes(data.remainingMinutes ?? 0)}
                        </span>
                     </p>
                     <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                     </div>
                  </div>
               ) : null}

               <Link
                  to="/"
                  className="inline-flex h-11 items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
               >
                  Abrir acompanhamento de Atividades Complementares <ArrowRight className="size-4" aria-hidden />
               </Link>
            </section>
         </main>
      </div>
   );
}
