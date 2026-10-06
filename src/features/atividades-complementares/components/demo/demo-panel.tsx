import { useState } from "react";
import { FlaskConical, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldLabel } from "@/components/ui/field-label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { isDemoToolsEnabled } from "../../api/gateway";
import { useResetDemo, useSelectScenario, useSimulateDecision, useUpdateDemoSettings } from "../../api/mutations";
import { useDemoState, useRequests } from "../../api/queries";
import type { DemoSimulationSettings, SimulatedDecision } from "../../types/gateway";
import type { ActivityRequest } from "../../types/request.schema";
import { statusOf } from "../../content/texts";
import { formatMinutes, parseDurationFields } from "../../rules/duration";

const SLOW_LATENCY = 2500;
const NORMAL_LATENCY = 350;

/**
 * Ferramenta discreta de DEMONSTRAÇÃO (fora do fluxo do aluno): cenários,
 * simulações de carregamento/falha, decisões manuais e reset. Nada é aprovado
 * sem uma ação explícita aqui.
 */
export function DemoPanelTrigger({ className, compact }: { className?: string; compact?: boolean }) {
   if (!isDemoToolsEnabled()) return null;
   return (
      <Sheet>
         <SheetTrigger asChild>
            <button
               type="button"
               className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  className,
               )}
               title="Modo de demonstração"
            >
               <FlaskConical className="size-3.5 shrink-0" aria-hidden />
               {compact ? <span className="sr-only">Modo de demonstração</span> : <span>Modo de demonstração</span>}
            </button>
         </SheetTrigger>
         <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader>
               <SheetTitle className="flex items-center gap-2">
                  <FlaskConical className="size-4" aria-hidden /> Modo de demonstração
               </SheetTitle>
               <SheetDescription>
                  Uso interno para apresentar o protótipo. Não faz parte da experiência do aluno. Todos os dados são fictícios.
               </SheetDescription>
            </SheetHeader>
            <DemoPanelBody />
         </SheetContent>
      </Sheet>
   );
}

function DemoPanelBody() {
   const demo = useDemoState();
   const requests = useRequests();
   const selectScenario = useSelectScenario();
   const updateSettings = useUpdateDemoSettings();
   const resetDemo = useResetDemo();
   const [confirmReset, setConfirmReset] = useState(false);

   if (!demo.data) return <p className="px-4 text-sm text-muted-foreground">Carregando…</p>;
   const { settings } = demo.data;
   const set = (patch: Partial<DemoSimulationSettings>) => updateSettings.mutate(patch, { onSuccess: () => void demo.refetch() });
   const pending = (requests.data ?? []).filter(r => r.status === "em_analise" || r.status === "reconsideracao_em_analise");

   return (
      <div className="space-y-6 px-4 pb-8">
         <section className="space-y-2">
            <FieldLabel htmlFor="demo-scenario">Cenário</FieldLabel>
            <Select
               value={demo.data.scenarioId}
               onValueChange={id =>
                  selectScenario.mutate(id, {
                     onSuccess: () => {
                        void demo.refetch();
                        toast.success("Cenário carregado.", { description: "Pedidos, rascunhos e arquivos anteriores foram limpos." });
                     },
                  })
               }
            >
               <SelectTrigger id="demo-scenario" className="w-full data-[size=default]:h-11">
                  <SelectValue />
               </SelectTrigger>
               <SelectContent>
                  {demo.data.scenarios.map(s => (
                     <SelectItem key={s.id} value={s.id}>
                        {s.label}
                     </SelectItem>
                  ))}
               </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Trocar de cenário recarrega o fixture e limpa o cache, sem misturar registros.</p>
         </section>

         <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Simulações</h3>
            {(
               [
                  [
                     "slow",
                     "Carregamento lento",
                     "Atraso de 2,5 s em cada chamada.",
                     settings.latencyMs >= SLOW_LATENCY,
                     (v: boolean) => set({ latencyMs: v ? SLOW_LATENCY : NORMAL_LATENCY }),
                  ],
                  [
                     "fail-submit",
                     "Falhar a primeira tentativa de envio",
                     "O retry usa a mesma chave de idempotência e não duplica o pedido.",
                     settings.failFirstSubmitAttempt,
                     (v: boolean) => set({ failFirstSubmitAttempt: v }),
                  ],
                  [
                     "fail-list",
                     "Falhar a lista de pedidos",
                     "Mostra o estado de erro do acompanhamento.",
                     settings.failRequestList,
                     (v: boolean) => set({ failRequestList: v }),
                  ],
                  [
                     "expired",
                     "Prazos de correção e reconsideração vencidos",
                     "Usa 30/09/2026 como prazo (referência: 05/10/2026).",
                     settings.expiredActionDeadlines,
                     (v: boolean) => set({ expiredActionDeadlines: v }),
                  ],
               ] as const
            ).map(([id, label, hint, checked, onChange]) => (
               <div key={id} className="flex items-start justify-between gap-4 rounded-md border border-border px-3 py-2.5">
                  <label htmlFor={`demo-${id}`} className="text-sm">
                     <span className="block font-medium text-foreground">{label}</span>
                     <span className="block text-xs text-muted-foreground">{hint}</span>
                  </label>
                  <Switch id={`demo-${id}`} checked={checked} onCheckedChange={onChange} className="mt-1" />
               </div>
            ))}
         </section>

         <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Simular decisão da coordenação</h3>
            {pending.length === 0 ? (
               <p className="text-sm text-muted-foreground">Nenhum pedido em análise neste cenário.</p>
            ) : (
               <ul className="space-y-3">
                  {pending.map(r => (
                     <DecisionItem key={r.id} request={r} />
                  ))}
               </ul>
            )}
         </section>

         <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Dados locais</h3>
            <p className="text-xs text-muted-foreground">
               Versão do armazenamento: {demo.data.storageVersion}. Arquivos anexados:{" "}
               {demo.data.bytesPersistence === "indexeddb"
                  ? "guardados neste navegador (IndexedDB)"
                  : "somente em memória (reanexar após recarregar)"}
               .
            </p>
            <Button variant="outline" className="h-11 w-full gap-2" onClick={() => setConfirmReset(true)}>
               <RotateCcw className="size-4" aria-hidden /> Restaurar dados de demonstração
            </Button>
         </section>

         <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
            <DialogContent>
               <DialogHeader>
                  <DialogTitle>Restaurar demonstração?</DialogTitle>
                  <DialogDescription>
                     Pedidos enviados, rascunhos e arquivos deste navegador serão apagados. O cenário atual volta ao estado do fixture.
                  </DialogDescription>
               </DialogHeader>
               <DialogFooter>
                  <Button variant="outline" className="h-11" onClick={() => setConfirmReset(false)}>
                     Cancelar
                  </Button>
                  <Button
                     variant="destructive"
                     className="h-11"
                     disabled={resetDemo.isPending}
                     onClick={() =>
                        resetDemo.mutate(undefined, {
                           onSuccess: () => {
                              setConfirmReset(false);
                              void demo.refetch();
                              toast.success("Demonstração restaurada.");
                           },
                        })
                     }
                  >
                     Restaurar
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>
   );
}

function DecisionItem({ request }: { request: ActivityRequest }) {
   const simulate = useSimulateDecision();
   const requested = request.requestedMinutes ?? 0;
   const [hours, setHours] = useState(String(Math.floor(requested / 60)));
   const [minutes, setMinutes] = useState(String(requested % 60));
   const [reason, setReason] = useState("");
   const inReconsideration = request.status === "reconsideracao_em_analise";

   function decide(decision: SimulatedDecision) {
      simulate.mutate(
         { requestId: request.id, decision },
         {
            onSuccess: updated => toast.success(`Decisão simulada: ${statusOf(updated).label}.`),
            onError: () => toast.error("Não foi possível simular a decisão."),
         },
      );
   }

   const parsed = parseDurationFields({ hours, minutes });
   const approved = parsed.ok && parsed.minutes != null ? Math.min(parsed.minutes, requested) : requested;

   return (
      <li className="space-y-3 rounded-md border border-border p-3 text-sm">
         <div>
            <p className="font-medium text-foreground">{request.title}</p>
            <p className="text-xs text-muted-foreground">
               {request.protocol} · solicitadas {formatMinutes(requested)} · {statusOf(request).label}
            </p>
         </div>
         <div className="grid grid-cols-2 gap-2">
            <div>
               <label htmlFor={`demo-h-${request.id}`} className="text-xs text-muted-foreground">
                  Horas aprovadas
               </label>
               <Input
                  id={`demo-h-${request.id}`}
                  inputMode="numeric"
                  className="h-11"
                  value={hours}
                  onChange={e => setHours(e.target.value.replace(/\D/g, ""))}
               />
            </div>
            <div>
               <label htmlFor={`demo-m-${request.id}`} className="text-xs text-muted-foreground">
                  Minutos
               </label>
               <Input
                  id={`demo-m-${request.id}`}
                  inputMode="numeric"
                  className="h-11"
                  value={minutes}
                  onChange={e => setMinutes(e.target.value.replace(/\D/g, "").slice(0, 2))}
               />
            </div>
         </div>
         <div>
            <label htmlFor={`demo-r-${request.id}`} className="text-xs text-muted-foreground">
               Motivo (exibido ao aluno)
            </label>
            <Textarea
               id={`demo-r-${request.id}`}
               rows={2}
               value={reason}
               onChange={e => setReason(e.target.value)}
               placeholder="Ex.: comprovante sem carga horária legível."
            />
         </div>
         <div className="flex flex-wrap gap-2">
            <Button
               size="sm"
               className="h-11"
               disabled={simulate.isPending || approved <= 0}
               onClick={() => decide({ kind: "aprovar", approvedMinutes: approved, reason: reason || null })}
            >
               Aprovar {formatMinutes(approved)}
            </Button>
            {!inReconsideration ? (
               <Button
                  size="sm"
                  variant="outline"
                  className="h-11"
                  disabled={simulate.isPending}
                  onClick={() =>
                     decide({
                        kind: "pedir_correcao",
                        reason: reason || "O comprovante está ilegível. Anexe uma versão legível.",
                        deadlineDate: null,
                     })
                  }
               >
                  Pedir correção
               </Button>
            ) : null}
            <Button
               size="sm"
               variant="outline"
               className="h-11 text-destructive"
               disabled={simulate.isPending}
               onClick={() =>
                  decide({
                     kind: "nao_aprovar",
                     reason: reason || "A atividade não atende aos requisitos do tipo selecionado.",
                     deadlineDate: null,
                  })
               }
            >
               Não aprovar
            </Button>
         </div>
      </li>
   );
}
