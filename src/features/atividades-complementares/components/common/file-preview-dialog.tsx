import { Download, ExternalLink, Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAttachmentBlob } from "../../api/queries";
import { useObjectUrl } from "../../hooks/use-object-url";
import { formatBytes } from "../../rules/files";

interface FilePreviewDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   name: string;
   /** Arquivo em memória (recém-anexado) ou id para buscar os bytes no gateway. */
   file?: Blob | null;
   attachmentId?: string | null;
}

/**
 * Prévia local de PDF via object URL (revogado ao fechar). DOC/DOCX não têm
 * renderização nativa no navegador: oferecemos apenas o download.
 */
export function FilePreviewDialog({ open, onOpenChange, name, file, attachmentId }: FilePreviewDialogProps) {
   const remote = useAttachmentBlob(open && !file ? (attachmentId ?? null) : null);
   const blob = open ? (file ?? remote.data ?? null) : null;
   const url = useObjectUrl(blob);
   const isPdf = name.toLowerCase().endsWith(".pdf");

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="flex max-h-[92svh] w-full flex-col sm:max-w-3xl">
            <DialogHeader className="pr-8">
               <DialogTitle className="break-all text-base">{name}</DialogTitle>
               <DialogDescription>
                  {blob
                     ? `Arquivo local · ${formatBytes(blob.size)}. A prévia não confirma a autenticidade do documento.`
                     : "Carregando arquivo…"}
               </DialogDescription>
            </DialogHeader>

            {remote.isLoading ? (
               <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> Carregando…
               </div>
            ) : !blob ? (
               <p className="py-6 text-sm text-muted-foreground">Este arquivo não está disponível neste dispositivo.</p>
            ) : isPdf && url ? (
               <iframe title={`Prévia de ${name}`} src={url} className="h-[65svh] w-full rounded-md border border-border bg-muted" />
            ) : (
               <p className="py-4 text-sm text-muted-foreground">
                  Arquivos DOC e DOCX não podem ser exibidos aqui. Baixe o arquivo para conferir o conteúdo.
               </p>
            )}

            {url ? (
               <div className="flex flex-wrap justify-end gap-2">
                  {isPdf ? (
                     <a href={url} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }), "h-11 gap-2")}>
                        <ExternalLink className="size-4" aria-hidden /> Abrir em nova aba
                     </a>
                  ) : null}
                  <a href={url} download={name} className={cn(buttonVariants(), "h-11 gap-2")}>
                     <Download className="size-4" aria-hidden /> Baixar
                  </a>
               </div>
            ) : null}
         </DialogContent>
      </Dialog>
   );
}
