import { ChevronRight, Info, Lightbulb, Luggage } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AUTOMATIC_NOTE, HOW_IT_WORKS, WHAT_ARE, WHAT_COUNTS } from "../../content/basics";
import { formatMinutes } from "../../rules/duration";

/** Explicação para quem está começando: o que são, quanto precisa, como funciona. */
export function WhatAreCard({ requiredMinutes }: { requiredMinutes: number | null }) {
   return (
      <section aria-labelledby="ac-what-are" className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
         <div className="flex items-start gap-3">
            <Lightbulb className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div>
               <h2 id="ac-what-are" className="text-[15px] font-semibold text-foreground">
                  {WHAT_ARE.title}
               </h2>
               <p className="mt-1 text-sm text-muted-foreground">
                  {WHAT_ARE.short}
                  {requiredMinutes ? ` No seu curso, são ${formatMinutes(requiredMinutes)}.` : ""}
               </p>
            </div>
         </div>
         <HowItWorks />
         <Link
            to="/ajuda#o-que-conta"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
         >
            Veja o que conta como hora <ChevronRight className="size-4" aria-hidden />
         </Link>
      </section>
   );
}

export function HowItWorks({ className }: { className?: string }) {
   return (
      <ol className={cn("grid gap-2 sm:grid-cols-3", className)}>
         {HOW_IT_WORKS.map((step, i) => (
            <li key={step.title} className="flex items-start gap-3 rounded-lg bg-surface p-3">
               <span
                  className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                  aria-hidden
               >
                  {i + 1}
               </span>
               <span>
                  <span className="block text-sm font-medium text-foreground">{step.title}</span>
                  <span className="block text-xs text-muted-foreground">{step.text}</span>
               </span>
            </li>
         ))}
      </ol>
   );
}

/** Atalhos de orientação na tela inicial: o que conta e Bagagens. */
export function QuickLinks() {
   const items = [
      { to: "/ajuda#o-que-conta", icon: Info, title: "O que conta como hora?", text: "Exemplos e limites" },
      { to: "/bagagens", icon: Luggage, title: "Bagagens", text: "Cursos grátis de 15h" },
   ];
   return (
      <nav aria-label="Orientações" className="grid grid-cols-2 gap-2">
         {items.map(item => (
            <Link
               key={item.to}
               to={item.to}
               className="flex min-h-16 items-center gap-2.5 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-surface active:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
               <item.icon className="size-5 shrink-0 text-primary" aria-hidden />
               <span className="min-w-0">
                  <span className="block text-sm font-medium leading-tight text-foreground">{item.title}</span>
                  <span className="block text-xs text-muted-foreground">{item.text}</span>
               </span>
            </Link>
         ))}
      </nav>
   );
}

/** "O que conta", por categoria, com exemplos do dia a dia. */
export function WhatCounts() {
   return (
      <div className="space-y-3">
         <ul className="grid gap-2 sm:grid-cols-2">
            {WHAT_COUNTS.map(group => (
               <li key={group.category} className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold text-foreground">{group.title}</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                     {group.examples.map(example => (
                        <li key={example} className="rounded-full bg-surface px-2.5 py-1 text-xs text-foreground">
                           {example}
                        </li>
                     ))}
                  </ul>
               </li>
            ))}
         </ul>
         <p className="flex items-start gap-2 rounded-lg bg-success-soft px-3 py-2 text-sm text-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            <span>
               {AUTOMATIC_NOTE}{" "}
               <Link to="/bagagens" className="font-medium text-primary underline underline-offset-4">
                  Conheça as Bagagens
               </Link>
            </span>
         </p>
      </div>
   );
}
