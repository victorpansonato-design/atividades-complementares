import { useEffect, useRef, useState, type DragEvent } from "react";
import { Building2, CheckCircle2, Circle, Eye, FileText, Link2, Paperclip, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilesInput } from "@/components/ui/files-input";
import { cn } from "@/lib/utils";
import type { InstitutionalRecordState, Policies } from "../../types/student.schema";
import { ACCEPT_ATTRIBUTE, describeFileProblem, fileExtension, formatBytes, validateFile } from "../../rules/files";
import { evaluateCoverage, requirementLabel, type ResolvedRequirement } from "../../rules/requirements";
import { useAttachmentStorage } from "../../hooks/use-attachment-storage";
import { FilePreviewDialog } from "../common/file-preview-dialog";
import type { FormAttachment } from "./form-model";

interface PendingUpload {
   key: string;
   name: string;
   progress: number;
   target: string | null;
}

interface AttachmentsFieldProps {
   requirements: ResolvedRequirement[];
   value: FormAttachment[];
   onChange: (next: FormAttachment[]) => void;
   policies: Pick<Policies, "maxUploadBytesPerFile" | "maxFilesPerRequest" | "uploadLimitsAreMock">;
   institutionalRecords: Record<string, InstitutionalRecordState>;
   /** Arquivos em memória desta sessão (prévia sem ida ao armazenamento). */
   localFiles: Map<string, File>;
   error?: string;
   /** Título da seção (reconsideração usa outro). `null` = sem cabeçalho (já há um bloco em volta). */
   title?: string | null;
   description?: string;
   optional?: boolean;
   /** Informa se há arquivo sendo preparado (para não avançar antes de terminar). */
   onBusyChange?: (busy: boolean) => void;
}

type UploadRequirement = Extract<ResolvedRequirement, { kind: "upload" }>;

function newId(): string {
   return `ANEXO-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`}`;
}

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

const INSTITUTIONAL_STATE: Record<InstitutionalRecordState, string> = {
   confirmed: "Cadastro confirmado pela coordenação (estado simulado).",
   not_found: "Cadastro ainda não localizado. A coordenação do curso precisa registrá-lo.",
   unknown: "A coordenação confirma o cadastro.",
};

/**
 * Comprovantes organizados POR DOCUMENTO EXIGIDO: cada item tem o próprio botão
 * "Anexar". Um arquivo pode valer para mais de um item ("Usar o mesmo arquivo").
 * Selecionar arquivo não comprova autenticidade: a coordenação analisa o conteúdo.
 */
export function AttachmentsField({
   requirements,
   value,
   onChange,
   policies,
   institutionalRecords,
   localFiles,
   error,
   title = "Comprovante",
   description,
   optional = false,
   onBusyChange,
}: AttachmentsFieldProps) {
   const storage = useAttachmentStorage();
   const [pending, setPending] = useState<PendingUpload[]>([]);
   const [problems, setProblems] = useState<string[]>([]);
   const [notice, setNotice] = useState<string | null>(null);
   const [preview, setPreview] = useState<FormAttachment | null>(null);
   const valueRef = useRef(value);
   useEffect(() => {
      valueRef.current = value;
   }, [value]);
   const busy = pending.length > 0;
   useEffect(() => {
      onBusyChange?.(busy);
   }, [busy, onBusyChange]);
   useEffect(() => () => onBusyChange?.(false), [onBusyChange]);

   const uploadRequirements = requirements.filter((r): r is UploadRequirement => r.kind === "upload");
   const institutional = requirements.filter(r => r.kind === "institutional");
   const usable = value.filter(a => a.state !== "missing");
   const coverage = evaluateCoverage(requirements, usable, institutionalRecords);
   const maxMb = Math.round(policies.maxUploadBytesPerFile / (1024 * 1024));
   const generic = uploadRequirements.length === 0;

   function commit(next: FormAttachment[]) {
      valueRef.current = next;
      onChange(next);
   }

   /** Valida, guarda os bytes e mostra progresso local simulado. Falha de um arquivo não apaga os outros. */
   async function processFile(file: File, options: { replaceId?: string | null; target?: string | null }) {
      const problem = await validateFile(file, policies.maxUploadBytesPerFile);
      if (problem) {
         setProblems(p => [...p, describeFileProblem(file.name, problem)]);
         return;
      }
      if (!options.replaceId && valueRef.current.length + 1 > policies.maxFilesPerRequest) {
         setProblems(p => [...p, `"${file.name}" não foi anexado: o limite é ${policies.maxFilesPerRequest} arquivos por pedido.`]);
         return;
      }
      const id = newId();
      setPending(p => [...p, { key: id, name: file.name, progress: 5, target: options.target ?? null }]);
      const stored = storage.store(id, file);
      for (const step of [35, 70, 90]) {
         await wait(110);
         setPending(p => p.map(x => (x.key === id ? { ...x, progress: step } : x)));
      }
      const { persisted } = await stored;
      setPending(p => p.filter(x => x.key !== id));
      localFiles.set(id, file);
      if (!persisted) setNotice("Este navegador não guarda arquivos: se a página for recarregada, será preciso anexá-los de novo.");

      const current = valueRef.current;
      const previous = options.replaceId ? current.find(a => a.id === options.replaceId) : undefined;
      const keys = previous?.requirementKeys.length ? previous.requirementKeys : options.target ? [options.target] : [];
      const entry: FormAttachment = {
         id,
         name: file.name,
         extension: fileExtension(file.name),
         mimeType: file.type || null,
         sizeBytes: file.size,
         requirementKeys: keys,
         demoOnly: false,
         state: "ready",
         addedAt: new Date().toISOString(),
      };
      commit(previous ? current.map(a => (a.id === previous.id ? entry : a)) : [...current, entry]);
      if (previous) {
         localFiles.delete(previous.id);
         if (previous.state !== "kept") void storage.discard(previous.id);
      }
   }

   async function handleFiles(files: File[], options: { replaceId?: string | null; target?: string | null } = {}) {
      setProblems([]);
      for (const file of files) await processFile(file, options);
   }

   function remove(attachment: FormAttachment) {
      commit(value.filter(a => a.id !== attachment.id));
      localFiles.delete(attachment.id);
      // Versões já enviadas continuam preservadas no histórico do pedido.
      if (attachment.state !== "kept") void storage.discard(attachment.id);
   }

   function linkTo(attachment: FormAttachment, key: string) {
      commit(value.map(a => (a.id === attachment.id ? { ...a, requirementKeys: [...new Set([...a.requirementKeys, key])] } : a)));
   }

   const rowProps = (attachment: FormAttachment) => ({
      attachment,
      onPreview: () => setPreview(attachment),
      onReplace: (file: File) => void handleFiles([file], { replaceId: attachment.id }),
      onRemove: () => remove(attachment),
   });

   return (
      <section id="ac-attachments" tabIndex={-1} aria-labelledby="ac-attachments-title" className="space-y-3 outline-none">
         <div className={cn(title === null && "sr-only")}>
            <h3 id="ac-attachments-title" className="font-display text-[15px] font-medium text-foreground">
               {title ?? "Comprovantes"}
               {optional ? <span className="ml-1 font-sans text-xs font-normal text-muted-foreground">(opcional)</span> : null}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
               {description ?? (generic ? "PDF, DOC ou DOCX." : "PDF, DOC ou DOCX. Um arquivo pode valer para mais de um item.")}
            </p>
         </div>

         {uploadRequirements.map(requirement => {
            const item = coverage.items.find(i => i.requirement.key === requirement.key)!;
            const files = value.filter(a => a.requirementKeys.includes(requirement.key));
            const reusable = requirement.canShareFileWithOtherRequirements
               ? usable.filter(a => !a.requirementKeys.includes(requirement.key) && a.requirementKeys.length > 0)
               : [];
            const pendingHere = pending.filter(p => p.target === requirement.key);
            return (
               <RequirementSlot
                  key={requirement.key}
                  label={requirementLabel(requirement)}
                  alternatives={requirement.anyOf.length > 1}
                  covered={item.covered}
                  onFiles={files => void handleFiles(files, { target: requirement.key })}
               >
                  {files.map(f => (
                     <AttachmentRow key={f.id} {...rowProps(f)} />
                  ))}
                  {pendingHere.map(p => (
                     <PendingRow key={p.key} pending={p} />
                  ))}
                  {!item.covered && reusable.length > 0 ? (
                     <div className="flex flex-wrap gap-2">
                        {reusable.map(f => (
                           <Button
                              key={f.id}
                              type="button"
                              variant="outline"
                              className="h-11 max-w-full gap-2"
                              onClick={() => linkTo(f, requirement.key)}
                           >
                              <Link2 className="size-4 shrink-0" aria-hidden />
                              <span className="truncate">Usar o mesmo arquivo ({f.name})</span>
                           </Button>
                        ))}
                     </div>
                  ) : null}
               </RequirementSlot>
            );
         })}

         {institutional.map(r => (
            <div key={r.key} className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
               <Building2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
               <span>
                  <span className="block font-medium text-foreground">Você não precisa anexar nada</span>
                  <span className="block text-muted-foreground">
                     {requirementLabel(r)}.{" "}
                     {INSTITUTIONAL_STATE[coverage.items.find(i => i.requirement.key === r.key)?.institutionalState ?? "unknown"]}
                  </span>
               </span>
            </div>
         ))}

         {generic ? (
            <>
               <FilesInput
                  value={[]}
                  onChange={files => void handleFiles(files)}
                  accept={ACCEPT_ATTRIBUTE}
                  multiple
                  label="Selecionar arquivos"
                  hint="Toque para escolher ou arraste aqui."
               />
               {pending.map(p => (
                  <PendingRow key={p.key} pending={p} />
               ))}
               {value.length ? (
                  <ul className="space-y-2" aria-label="Arquivos anexados">
                     {value.map(f => (
                        <li key={f.id}>
                           <AttachmentRow {...rowProps(f)} />
                        </li>
                     ))}
                  </ul>
               ) : null}
            </>
         ) : (
            // Arquivos sem vínculo (ex.: depois de trocar de atividade) continuam visíveis para reaproveitar ou remover.
            value
               .filter(a => a.requirementKeys.every(k => !uploadRequirements.some(r => r.key === k)))
               .map(f => (
                  <div key={f.id} className="space-y-2 rounded-xl border border-dashed border-border p-3">
                     <p className="text-xs text-muted-foreground">Arquivo anexado antes, ainda sem uso nesta atividade:</p>
                     <AttachmentRow {...rowProps(f)} />
                     <div className="flex flex-wrap gap-2">
                        {uploadRequirements.map(r => (
                           <Button
                              key={r.key}
                              type="button"
                              variant="outline"
                              className="h-11 max-w-full gap-2"
                              onClick={() => linkTo(f, r.key)}
                           >
                              <Link2 className="size-4 shrink-0" aria-hidden />
                              <span className="truncate">Usar para: {requirementLabel(r)}</span>
                           </Button>
                        ))}
                     </div>
                  </div>
               ))
         )}

         <div aria-live="polite" className="space-y-2">
            {problems.length > 0 ? (
               <ul className="space-y-1 rounded-lg border border-destructive/40 bg-destructive-soft px-3 py-2 text-sm text-destructive">
                  {problems.map(p => (
                     <li key={p}>{p}</li>
                  ))}
               </ul>
            ) : null}
            {notice ? <p className="text-xs text-warning-foreground">{notice}</p> : null}
         </div>

         {error ? (
            <p id="ac-attachments-error" className="text-sm font-medium text-destructive">
               {error}
            </p>
         ) : null}

         <p className="text-xs text-muted-foreground">
            Só tem foto do comprovante? Use o scanner do celular (app Arquivos, Google Drive ou similar) para salvar em PDF.
         </p>
         <p className="text-xs text-muted-foreground">
            {policies.uploadLimitsAreMock ? "Limite desta demonstração (provisório): " : "Limite: "}
            {maxMb} MB por arquivo, {policies.maxFilesPerRequest} arquivos por pedido. Anexar não comprova a autenticidade: a coordenação
            analisa o conteúdo.
         </p>

         <FilePreviewDialog
            open={!!preview}
            onOpenChange={open => !open && setPreview(null)}
            name={preview?.name ?? ""}
            file={preview ? (localFiles.get(preview.id) ?? null) : null}
            attachmentId={preview?.id ?? null}
         />
      </section>
   );
}

function RequirementSlot({
   label,
   alternatives,
   covered,
   onFiles,
   children,
}: {
   label: string;
   alternatives: boolean;
   covered: boolean;
   onFiles: (files: File[]) => void;
   children: React.ReactNode;
}) {
   const inputRef = useRef<HTMLInputElement>(null);
   const [dragging, setDragging] = useState(false);
   const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files?.length) onFiles(Array.from(e.dataTransfer.files));
   };
   return (
      <div
         onDragOver={e => {
            e.preventDefault();
            setDragging(true);
         }}
         onDragLeave={() => setDragging(false)}
         onDrop={onDrop}
         className={cn(
            "space-y-3 rounded-xl border p-3 transition-colors sm:p-4",
            covered ? "border-success/40 bg-success-soft/40" : "border-border bg-card",
            dragging && "border-primary bg-primary-soft",
         )}
      >
         <div className="flex items-start gap-3">
            {covered ? (
               <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
            ) : (
               <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
               <p className="text-sm font-medium text-foreground">{label}</p>
               <p className={cn("text-xs", covered ? "text-success" : "text-muted-foreground")}>
                  {covered ? "Anexado" : alternatives ? "Falta anexar · basta uma das opções" : "Falta anexar"}
               </p>
            </div>
         </div>
         {children}
         <Button
            type="button"
            variant={covered ? "ghost" : "default"}
            className={cn("h-11 w-full gap-2 sm:w-auto", covered && "text-primary")}
            onClick={() => inputRef.current?.click()}
         >
            {covered ? <Plus className="size-4" aria-hidden /> : <Paperclip className="size-4" aria-hidden />}
            {covered ? "Adicionar outro arquivo" : "Anexar arquivo"}
            <span className="sr-only">: {label}</span>
         </Button>
         <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={e => {
               if (e.target.files?.length) onFiles(Array.from(e.target.files));
               e.target.value = "";
            }}
         />
      </div>
   );
}

function PendingRow({ pending }: { pending: PendingUpload }) {
   return (
      <div className="rounded-lg border border-border bg-card px-3 py-2">
         <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{pending.name}</span>
            <span className="text-xs text-muted-foreground tabular">Preparando… {pending.progress}%</span>
         </div>
         <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label={`Preparando ${pending.name}`}
            aria-valuenow={pending.progress}
            aria-valuemin={0}
            aria-valuemax={100}
         >
            <div className="h-full bg-primary motion-safe:transition-[width]" style={{ width: `${pending.progress}%` }} />
         </div>
      </div>
   );
}

function AttachmentRow({
   attachment,
   onPreview,
   onReplace,
   onRemove,
}: {
   attachment: FormAttachment;
   onPreview: () => void;
   onReplace: (file: File) => void;
   onRemove: () => void;
}) {
   const replaceRef = useRef<HTMLInputElement>(null);
   const isPdf = attachment.name.toLowerCase().endsWith(".pdf");
   const canPreview = attachment.state === "ready" || (attachment.state === "kept" && !attachment.demoOnly);

   return (
      <div className={cn("rounded-lg border bg-card px-3 py-2", attachment.state === "missing" ? "border-warning/60" : "border-border")}>
         <div className="flex items-center gap-3">
            <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0 flex-1">
               <span className="block truncate text-sm font-medium text-foreground" title={attachment.name}>
                  {attachment.name}
               </span>
               <span className="block text-xs text-muted-foreground tabular">
                  {attachment.state === "missing"
                     ? "Reanexe: o arquivo não está mais neste dispositivo"
                     : attachment.state === "kept"
                       ? attachment.demoOnly
                          ? "Arquivo de demonstração (sem conteúdo)"
                          : "Enviado anteriormente"
                       : attachment.sizeBytes != null
                         ? formatBytes(attachment.sizeBytes)
                         : ""}
               </span>
            </span>
            {attachment.state === "missing" ? (
               <Badge tone="warning" size="sm">
                  Reanexar
               </Badge>
            ) : null}
         </div>
         <div className="mt-1 flex flex-wrap gap-1">
            {canPreview ? (
               <Button type="button" variant="ghost" size="sm" className="h-11 gap-1.5 px-2.5" onClick={onPreview}>
                  <Eye className="size-4" aria-hidden /> {isPdf ? "Ver" : "Baixar"}
                  <span className="sr-only"> {attachment.name}</span>
               </Button>
            ) : null}
            <Button type="button" variant="ghost" size="sm" className="h-11 gap-1.5 px-2.5" onClick={() => replaceRef.current?.click()}>
               <RefreshCw className="size-4" aria-hidden /> {attachment.state === "missing" ? "Reanexar" : "Trocar"}
               <span className="sr-only"> {attachment.name}</span>
            </Button>
            <Button
               type="button"
               variant="ghost"
               size="sm"
               className="h-11 gap-1.5 px-2.5 text-destructive hover:bg-destructive-soft hover:text-destructive"
               onClick={onRemove}
            >
               <Trash2 className="size-4" aria-hidden /> Remover
               <span className="sr-only"> {attachment.name}</span>
            </Button>
            <input
               ref={replaceRef}
               type="file"
               accept={ACCEPT_ATTRIBUTE}
               className="sr-only"
               tabIndex={-1}
               aria-hidden
               onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) onReplace(file);
                  e.target.value = "";
               }}
            />
         </div>
      </div>
   );
}
