/**
 * Contêiner padrão para estados assíncronos (loading / erro / vazio / conteúdo).
 *
 * Centraliza o ternário de renderização e anima a troca entre estados com
 * fade + deslize sutil de entrada e saída. Use em qualquer bloco que dependa
 * de dados remotos (listas, tabelas, dashboards).
 *
 * Prioridade: loading → error → empty → children.
 */
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";

interface AsyncStateProps {
   isLoading: boolean;
   isError?: boolean;
   isEmpty?: boolean;
   loading: ReactNode;
   error?: ReactNode;
   empty?: ReactNode;
   children: ReactNode;
   className?: string;
}

export function AsyncState({ isLoading, isError, isEmpty, loading, error, empty, children, className }: AsyncStateProps) {
   const state = isLoading ? "loading" : isError ? "error" : isEmpty ? "empty" : "content";
   const slots = { loading, error, empty, content: children };

   return (
      <AnimatePresence mode="wait" initial={false}>
         <motion.div
            key={state}
            className={className}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
         >
            {slots[state]}
         </motion.div>
      </AnimatePresence>
   );
}
