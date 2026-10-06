import { useState } from "react";
import { Eye, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Attachment } from "../../types/request.schema";
import { formatBytes } from "../../rules/files";
import { FilePreviewDialog } from "./file-preview-dialog";

interface AttachmentListProps {
   attachments: Attachment[];
   /** Rótulos dos requisitos por chave, para mostrar o que cada arquivo comprova. */
   requirementLabels?: Record<string, string>;
   emptyText?: string;
}

/**
 * Lista somente leitura. Nunca oferece abrir arquivo que não existe: itens do seed
 * aparecem como "arquivo de demonstração"; bytes ausentes como indisponíveis.
 */
export function AttachmentList({ attachments, requirementLabels = {}, emptyText = "Nenhum arquivo anexado." }: AttachmentListProps) {
   const [preview, setPreview] = useState<Attachment | null>(null);

   if (attachments.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>;

   return (
      <>
         <ul className="space-y-2">
            {attachments.map(attachment => {
               const covers = attachment.requirementKeys.map(k => requirementLabels[k]).filter(Boolean);
               return (
                  <li key={attachment.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-3 py-2">
                     <span className="grid size-9 shrink-0 place-items-center rounded bg-muted text-muted-foreground" aria-hidden>
                        <FileText className="size-4" />
                     </span>
                     <span className="min-w-0 flex-1">
                        <span className="block break-all text-sm font-medium text-foreground">{attachment.name}</span>
                        <span className="block text-xs text-muted-foreground">
                           {[
                              attachment.sizeBytes != null ? formatBytes(attachment.sizeBytes) : null,
                              covers.length ? `Comprova: ${covers.join("; ")}` : null,
                           ]
                              .filter(Boolean)
                              .join(" · ")}
                        </span>
                     </span>
                     {attachment.demoOnly ? (
                        <Badge tone="neutral" size="sm">
                           Arquivo de demonstração (sem conteúdo)
                        </Badge>
                     ) : attachment.bytesAvailable ? (
                        <Button type="button" variant="outline" className="h-11 gap-2" onClick={() => setPreview(attachment)}>
                           <Eye className="size-4" aria-hidden />
                           {attachment.name.toLowerCase().endsWith(".pdf") ? "Visualizar" : "Baixar"}
                           <span className="sr-only"> {attachment.name}</span>
                        </Button>
                     ) : (
                        <Badge tone="neutral" size="sm">
                           Arquivo não disponível neste dispositivo
                        </Badge>
                     )}
                  </li>
               );
            })}
         </ul>
         <FilePreviewDialog
            open={!!preview}
            onOpenChange={open => !open && setPreview(null)}
            name={preview?.name ?? ""}
            attachmentId={preview?.id ?? null}
         />
      </>
   );
}
