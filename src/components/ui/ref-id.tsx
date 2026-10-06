import * as React from "react";
import { cn } from "@/lib/utils";

export interface RefIdProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Valor numérico/textual do identificador. */
  value: number | string;
  /** Prefixo (ex.: "REQ"). */
  prefix?: string;
  /** Segmento de ano entre prefixo e valor (ex.: 2026). */
  year?: number | string;
  /** Preenche o valor com zeros à esquerda até este comprimento. */
  pad?: number;
  /** Separador entre segmentos. Padrão "-". */
  separator?: string;
  /** Usa cor atenuada em vez de primary. */
  muted?: boolean;
}

const RefId = React.forwardRef<HTMLSpanElement, RefIdProps>(
  ({ value, prefix, year, pad = 0, separator = "-", muted = false, className, ...props }, ref) => {
    const padded = pad > 0 ? String(value ?? "").padStart(pad, "0") : String(value ?? "");
    const text = [prefix, year, padded].filter((p) => p != null && p !== "").join(separator);

    return (
      <span
        ref={ref}
        className={cn(
          "font-mono text-[13px] font-medium tracking-tight tabular",
          muted ? "text-muted-foreground" : "text-primary",
          className
        )}
        {...props}
      >
        {text}
      </span>
    );
  }
);
RefId.displayName = "RefId";

export { RefId };
