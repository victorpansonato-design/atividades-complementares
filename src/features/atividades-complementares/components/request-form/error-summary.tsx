import { forwardRef } from "react";
import type { FieldErrors } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import { FIELD_ID, FIELD_LABEL, type RequestFormValues } from "./form-model";

interface ErrorSummaryProps {
   errors: FieldErrors<RequestFormValues>;
   fields: readonly (keyof RequestFormValues)[];
}

/** Resumo de erros com links que levam o foco ao campo. Recebe foco ao aparecer. */
export const ErrorSummary = forwardRef<HTMLDivElement, ErrorSummaryProps>(({ errors, fields }, ref) => {
   const items = fields
      .map(field => ({ field, message: errors[field]?.message as string | undefined }))
      .filter((item): item is { field: keyof RequestFormValues; message: string } => !!item.message);
   if (items.length === 0) return null;

   return (
      <div
         ref={ref}
         tabIndex={-1}
         role="alert"
         className="rounded-lg border border-destructive/40 bg-destructive-soft px-4 py-3 text-sm text-destructive outline-none"
      >
         <p className="flex items-center gap-2 font-semibold">
            <AlertCircle className="size-4" aria-hidden />
            {items.length === 1 ? "Corrija 1 item para continuar" : `Corrija ${items.length} itens para continuar`}
         </p>
         <ul className="mt-2 list-disc space-y-1 pl-6">
            {items.map(item => (
               <li key={item.field}>
                  <a
                     href={`#${FIELD_ID[item.field]}`}
                     className="underline underline-offset-4"
                     onClick={e => {
                        e.preventDefault();
                        const el = document.getElementById(FIELD_ID[item.field]);
                        el?.focus();
                        el?.scrollIntoView({ block: "center" });
                     }}
                  >
                     {FIELD_LABEL[item.field]}: {item.message}
                  </a>
               </li>
            ))}
         </ul>
      </div>
   );
});
ErrorSummary.displayName = "ErrorSummary";
