import { CheckCircle2, ExternalLink, Luggage } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { BAGAGENS } from "../../content/basics";

/**
 * Bagagens: tela propositalmente curta. Promessa (15h por curso grátis), botão
 * grande para o AVA logo no topo, três passos e o recado mais importante: as
 * horas entram sozinhas no final do semestre (não é preciso pedir aqui).
 */
export function BagagensView() {
   return (
      <div className="mx-auto max-w-2xl space-y-5">
         <PageHeader className="pb-4 [&>div:last-child]:mt-3 [&_h1]:text-[22px] sm:[&_h1]:text-[28px]" title={BAGAGENS.title} />

         <section className="space-y-4 rounded-2xl border border-primary/20 bg-primary-soft/60 p-5" aria-labelledby="bagagens-headline">
            <div className="flex items-start gap-3">
               <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground" aria-hidden>
                  <Luggage className="size-6" />
               </span>
               <div className="min-w-0">
                  <h2 id="bagagens-headline" className="font-display text-xl font-medium leading-tight text-foreground">
                     {BAGAGENS.headline}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">{BAGAGENS.intro}</p>
               </div>
            </div>

            <a
               href={BAGAGENS.url}
               target="_blank"
               rel="noopener noreferrer"
               className={cn(buttonVariants({ size: "lg" }), "h-14 w-full gap-2 text-base shadow-md")}
            >
               {BAGAGENS.cta}
               <ExternalLink className="size-5" aria-hidden />
               <span className="sr-only">(abre o AVA em nova aba)</span>
            </a>
         </section>

         <div className="flex items-start gap-3 rounded-xl border border-success/40 bg-success-soft px-4 py-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
            <p className="text-sm text-foreground">
               <strong className="font-semibold">Não precisa pedir aqui.</strong> Se você concluir com 60% ou mais, as 15 horas entram
               sozinhas no seu histórico no final do semestre.
            </p>
         </div>

         <section aria-labelledby="bagagens-como" className="space-y-3">
            <h2 id="bagagens-como" className="text-sm font-semibold text-foreground">
               Como funciona
            </h2>
            <ol className="space-y-2">
               {BAGAGENS.steps.map((step, index) => (
                  <li key={step.title} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                     <span
                        className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
                        aria-hidden
                     >
                        {index + 1}
                     </span>
                     <span>
                        <span className="block text-sm font-medium text-foreground">{step.title}</span>
                        <span className="block text-sm text-muted-foreground">{step.text}</span>
                     </span>
                  </li>
               ))}
            </ol>
         </section>

         <p className="text-xs text-muted-foreground">{BAGAGENS.footnote}</p>
      </div>
   );
}
