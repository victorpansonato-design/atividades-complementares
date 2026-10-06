import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StatusPresentation } from "../../content/texts";

/** Situação com ícone + texto: nunca só cor. */
export function StatusBadge({ status, className }: { status: StatusPresentation; className?: string }) {
   const Icon = status.icon;
   return (
      <Badge tone={status.tone} size="md" className={cn("max-w-full whitespace-normal text-left", className)}>
         <Icon className="size-3.5 shrink-0" aria-hidden />
         <span>{status.label}</span>
      </Badge>
   );
}
