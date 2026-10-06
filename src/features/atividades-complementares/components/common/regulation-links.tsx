import { Download, FileText } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { env } from "@/config/env";
import { cn } from "@/lib/utils";

/** PDF local do regulamento (cópia do documento fornecido). */
export const REGULATION_URL = `${env.baseUrl}regulamento/regulamento-geral-2025.pdf`;

export function RegulationLink({ className, label = "Ver regulamento" }: { className?: string; label?: string }) {
   return (
      <a
         href={REGULATION_URL}
         target="_blank"
         rel="noreferrer"
         className={cn(buttonVariants({ variant: "outline" }), "h-11 gap-2", className)}
      >
         <FileText className="size-4" aria-hidden />
         {label}
         <span className="sr-only"> (PDF, abre em nova aba)</span>
      </a>
   );
}

export function RegulationDownload({ className }: { className?: string }) {
   return (
      <a
         href={REGULATION_URL}
         download="regulamento-atividades-complementares-2025.pdf"
         className={cn(buttonVariants({ variant: "ghost" }), "h-11 gap-2", className)}
      >
         <Download className="size-4" aria-hidden />
         Baixar PDF
      </a>
   );
}
