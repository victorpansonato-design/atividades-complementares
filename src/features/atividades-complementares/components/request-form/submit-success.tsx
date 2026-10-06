import { useEffect, useRef } from "react";
import { ArrowRight, CheckCircle2, Hourglass, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import { RefId } from "@/components/ui/ref-id";
import { cn } from "@/lib/utils";
import type { ActivityRequest } from "../../types/request.schema";
import { STATUS } from "../../content/texts";
import { formatMinutes } from "../../rules/duration";
import { StatusBadge } from "../common/status-badge";

interface SubmitSuccessProps {
   request: ActivityRequest;
   slaBusinessDays: number | null;
   title?: string;
   description?: string;
   onNew?: () => void;
}

/** Confirmação: protocolo, "Em análise" e horas aguardando. Não promete aprovação. */
export function SubmitSuccess({ request, slaBusinessDays, title = "Solicitação enviada", description, onNew }: SubmitSuccessProps) {
   const headingRef = useRef<HTMLHeadingElement>(null);
   useEffect(() => headingRef.current?.focus(), []);
   const status = request.status === "reconsideracao_em_analise" ? STATUS.reconsideracao_em_analise : STATUS.em_analise;

   return (
      <div className="mx-auto max-w-2xl space-y-6 py-4">
         <div className="rounded-xl border border-success/40 bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
               <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-success" aria-hidden />
               <div className="min-w-0 space-y-2">
                  <h2 ref={headingRef} tabIndex={-1} className="font-display text-xl font-medium text-foreground outline-none">
                     {title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                     {description ?? "Recebemos seu pedido. A coordenação vai analisar os documentos e decidir as horas."}
                  </p>
               </div>
            </div>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
               <div>
                  <dt className="text-xs text-muted-foreground">Protocolo</dt>
                  <dd className="mt-1">{request.protocol ? <RefId value={request.protocol} className="text-base" /> : "-"}</dd>
               </div>
               <div>
                  <dt className="text-xs text-muted-foreground">Situação</dt>
                  <dd className="mt-1">
                     <StatusBadge status={status} />
                  </dd>
               </div>
               <div>
                  <dt className="text-xs text-muted-foreground">Aguardando análise</dt>
                  <dd className="mt-1 flex items-center gap-1.5 font-semibold text-foreground tabular">
                     <Hourglass className="size-4 text-muted-foreground" aria-hidden />
                     {formatMinutes(request.requestedMinutes ?? 0)}
                  </dd>
               </div>
            </dl>
            <p className="mt-5 text-xs text-muted-foreground">
               {slaBusinessDays ? `Prazo informado para análise: até ${slaBusinessDays} dias úteis. ` : ""}
               As horas só entram no seu progresso depois de aprovadas, e a quantidade aprovada pode ser menor que a solicitada.
            </p>
         </div>
         <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {onNew ? (
               <Button type="button" variant="outline" className="h-11 gap-2" onClick={onNew}>
                  <Plus className="size-4" aria-hidden /> Enviar outra atividade
               </Button>
            ) : null}
            <Link to={`/pedidos/${encodeURIComponent(request.id)}`} className={cn(buttonVariants({ size: "lg" }), "gap-2 px-6")}>
               Acompanhar pedido <ArrowRight className="size-4" aria-hidden />
            </Link>
         </div>
      </div>
   );
}
