import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { env } from "@/config/env";
import { cn } from "@/lib/utils";

/**
 * "Voltar ao portal". O destino é configurável (VITE_PORTAL_RETURN_URL); sem
 * configuração, volta para a entrada local de demonstração. Não há URL de
 * produção inventada.
 */
export function PortalReturnLink({ className, iconOnlyOnMobile = false }: { className?: string; iconOnlyOnMobile?: boolean }) {
   const classes = cn(
      buttonVariants({ variant: "ghost", size: "sm" }),
      "h-11 gap-2 px-3 text-muted-foreground hover:text-foreground",
      className,
   );
   const content = (
      <>
         <ArrowLeft className="size-4" aria-hidden />
         <span className={cn(iconOnlyOnMobile && "sr-only sm:not-sr-only")}>Voltar ao portal</span>
      </>
   );
   if (env.portalReturnUrl) {
      return (
         <a href={env.portalReturnUrl} className={classes}>
            {content}
         </a>
      );
   }
   return (
      <Link to="/entrada-portal" className={classes} title="Entrada local de demonstração">
         {content}
      </Link>
   );
}
