import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export default function NotFoundPage() {
   return (
      <EmptyState
         title="Página não encontrada."
         hint="O endereço pode estar incompleto."
         actions={
            <Link to="/" className={cn(buttonVariants({ variant: "outline" }), "h-11")}>
               Ir para o acompanhamento
            </Link>
         }
      />
   );
}
