import { ChevronDown, CircleHelp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { helpFor, type HelpItem, type HelpTopic } from "../../content/help";
import { RegulationLink } from "../common/regulation-links";

export function HelpList({ items }: { items: HelpItem[] }) {
   return (
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
         {items.map(item => (
            <li key={item.id}>
               <Collapsible>
                  <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                     {item.question}
                     <ChevronDown
                        className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                        aria-hidden
                     />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{item.answer}</CollapsibleContent>
               </Collapsible>
            </li>
         ))}
      </ul>
   );
}

/** Ajuda contextual, secundária ao fluxo: abre por cima sem perder o preenchimento. */
export function HelpSheet({ topic, label = "Dúvidas" }: { topic: HelpTopic; label?: string }) {
   return (
      <Sheet>
         <SheetTrigger asChild>
            <Button type="button" variant="ghost" className="h-11 gap-2">
               <CircleHelp className="size-4" aria-hidden /> {label}
            </Button>
         </SheetTrigger>
         <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader>
               <SheetTitle>Dúvidas frequentes</SheetTitle>
               <SheetDescription>Orientações curtas. O regulamento completo continua disponível.</SheetDescription>
            </SheetHeader>
            <div className="space-y-4 px-4 pb-6">
               <HelpList items={helpFor(topic)} />
               <div className="flex flex-wrap gap-2">
                  <RegulationLink />
                  <Link
                     to="/ajuda"
                     className="inline-flex h-11 items-center px-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                     Ver toda a ajuda
                  </Link>
               </div>
            </div>
         </SheetContent>
      </Sheet>
   );
}
