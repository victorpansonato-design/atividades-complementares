import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";
import { env } from "@/config/env";

function createQueryClient() {
   return new QueryClient({
      defaultOptions: {
         queries: {
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 10,
            retry: (failureCount, error) => {
               if (error && typeof error === "object" && "status" in error) {
                  const status = error.status as number;
                  const httpCodesToNotRetry = [400, 401, 403, 404, 422];
                  if (httpCodesToNotRetry.includes(status)) return false;
               }
               return failureCount <= 1;
            },
            retryDelay: 500,
            refetchOnWindowFocus: false,
         },
         mutations: {
            // Envio de formulário nunca repete sozinho: o aluno decide e o retry reusa a chave de idempotência.
            retry: false,
         },
      },
   });
}

export function QueryProvider({ children }: { children: ReactNode }) {
   // Um cliente por montagem (não recriar a cada render).
   const [queryClient] = useState(createQueryClient);

   return (
      <QueryClientProvider client={queryClient}>
         {children}
         {import.meta.env.DEV && env.queryDevtools && <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />}
      </QueryClientProvider>
   );
}
