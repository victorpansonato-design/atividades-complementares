import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({ rows = 3 }: { rows?: number }) {
   return (
      <div className="space-y-6" aria-busy="true" aria-live="polite">
         <span className="sr-only">Carregando…</span>
         <Skeleton className="h-9 w-2/3 max-w-md" />
         <Skeleton className="h-32 w-full" />
         {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
         ))}
      </div>
   );
}

export function LoadError({ title, onRetry }: { title: string; onRetry?: () => void }) {
   return (
      <EmptyState
         tone="error"
         icon={AlertCircle}
         title={title}
         hint="Verifique sua conexão e tente de novo."
         actions={
            onRetry ? (
               <Button variant="outline" className="h-11" onClick={onRetry}>
                  Tentar novamente
               </Button>
            ) : null
         }
      />
   );
}
