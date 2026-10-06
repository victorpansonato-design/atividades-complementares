import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DurationFields } from "../../rules/duration";

interface DurationFieldProps {
   id: string;
   legend: ReactNode;
   value: DurationFields;
   onChange: (value: DurationFields) => void;
   onBlur?: () => void;
   description?: ReactNode;
   error?: string;
   required?: boolean;
}

/**
 * Duração em "Horas" + "Minutos" (não é horário do dia). Valores acima de 24h
 * são válidos. Minutos de 0 a 59. Nada de `input type="time"`.
 */
export function DurationField({ id, legend, value, onChange, onBlur, description, error, required }: DurationFieldProps) {
   const descId = description ? `${id}-desc` : undefined;
   const errId = error ? `${id}-error` : undefined;
   const describedBy = [descId, errId].filter(Boolean).join(" ") || undefined;
   const sanitize = (text: string) => text.replace(/\D/g, "").slice(0, 6);

   return (
      <fieldset className="space-y-2" aria-describedby={describedBy}>
         <legend className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            {legend}
            {required ? (
               <span className="text-warning" aria-hidden>
                  *
               </span>
            ) : null}
         </legend>
         {description ? (
            <div id={descId} className="text-sm text-muted-foreground">
               {description}
            </div>
         ) : null}
         <div className="flex flex-wrap items-end gap-3">
            <div className="w-28">
               <label htmlFor={id} className="mb-1 block text-xs text-muted-foreground">
                  Horas
               </label>
               <Input
                  id={id}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="0"
                  value={value.hours}
                  aria-invalid={!!error}
                  aria-describedby={describedBy}
                  className={cn("h-11 tabular", error && "border-destructive")}
                  onChange={e => onChange({ ...value, hours: sanitize(e.target.value) })}
                  onBlur={onBlur}
               />
            </div>
            <div className="w-24">
               <label htmlFor={`${id}-min`} className="mb-1 block text-xs text-muted-foreground">
                  Minutos
               </label>
               <Input
                  id={`${id}-min`}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="0"
                  maxLength={2}
                  value={value.minutes}
                  aria-invalid={!!error}
                  aria-describedby={describedBy}
                  className={cn("h-11 tabular", error && "border-destructive")}
                  onChange={e => onChange({ ...value, minutes: sanitize(e.target.value).slice(0, 2) })}
                  onBlur={onBlur}
               />
            </div>
            <span className="pb-3 text-xs text-muted-foreground">Ex.: 1h 30min</span>
         </div>
         {error ? (
            <p id={errId} className="text-sm text-destructive">
               {error}
            </p>
         ) : null}
      </fieldset>
   );
}
