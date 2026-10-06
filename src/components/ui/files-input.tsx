import * as React from "react";
import { File as FileIcon, ImageIcon, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FilesInputProps {
  value?: File[];
  onChange?: (files: File[]) => void;
  /** Lista accept do input (ex.: ".pdf,image/*"). */
  accept?: string;
  multiple?: boolean;
  /** Rejeita arquivos acima deste tamanho (MB). */
  maxSizeMb?: number;
  /** Limita a quantidade total de arquivos. */
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
  label?: React.ReactNode;
  hint?: React.ReactNode;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function matchesAccept(file: File, accept?: string): boolean {
  if (!accept) return true;
  const rules = accept.split(",").map((r) => r.trim().toLowerCase());
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return rules.some((rule) => {
    if (!rule) return false;
    if (rule.startsWith(".")) return name.endsWith(rule);
    if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1));
    return type === rule;
  });
}

export function FilesInput({
  value,
  onChange,
  accept,
  multiple = true,
  maxSizeMb,
  maxFiles,
  disabled = false,
  className,
  label = "Selecione os arquivos",
  hint,
}: FilesInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [internal, setInternal] = React.useState<File[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);

  const files = value ?? internal;

  const setFiles = (next: File[]) => {
    if (value === undefined) setInternal(next);
    onChange?.(next);
  };

  const addFiles = (incoming: FileList | File[]) => {
    const nextErrors: string[] = [];
    const accepted: File[] = [];
    for (const file of Array.from(incoming)) {
      if (!matchesAccept(file, accept)) {
        nextErrors.push(`"${file.name}": tipo não permitido.`);
        continue;
      }
      if (maxSizeMb && file.size > maxSizeMb * 1024 * 1024) {
        nextErrors.push(`"${file.name}": excede ${maxSizeMb} MB.`);
        continue;
      }
      accepted.push(file);
    }
    let merged = multiple ? [...files, ...accepted] : accepted.slice(0, 1);
    if (maxFiles && merged.length > maxFiles) {
      nextErrors.push(`Máximo de ${maxFiles} arquivo(s).`);
      merged = merged.slice(0, maxFiles);
    }
    setErrors(nextErrors);
    setFiles(merged);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const removeAt = (index: number) => {
    setErrors([]);
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <div className={cn("space-y-3", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center transition-colors outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          dragging ? "border-primary bg-primary-soft" : "border-border bg-surface hover:bg-muted",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <Upload className="size-5 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">
          {hint ?? "Arraste e solte aqui ou clique para procurar."}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={handleInput}
          className="sr-only"
          tabIndex={-1}
        />
      </button>

      {errors.length > 0 ? (
        <ul role="alert" className="space-y-1 text-xs text-destructive">
          {errors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      ) : null}

      {files.length > 0 ? (
        <ul className="space-y-2">
          {files.map((file, index) => {
            const isImage = file.type.startsWith("image/");
            return (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded bg-muted text-muted-foreground">
                  {isImage ? (
                    <ImageIcon className="size-4" aria-hidden />
                  ) : (
                    <FileIcon className="size-4" aria-hidden />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {file.name}
                  </span>
                  <span className="block text-xs text-muted-foreground tabular-nums">
                    {formatBytes(file.size)}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  onClick={() => removeAt(index)}
                  aria-label={`Remover ${file.name}`}
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
