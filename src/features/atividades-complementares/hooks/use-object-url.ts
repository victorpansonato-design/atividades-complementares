import { useEffect, useState } from "react";

/**
 * Object URL para prévia/download local. Criado e revogado no mesmo efeito
 * (sincroniza com um recurso externo do navegador): ao trocar o blob ou
 * desmontar, a URL anterior é revogada.
 */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
   const [entry, setEntry] = useState<{ blob: Blob; url: string } | null>(null);
   useEffect(() => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- recurso externo (object URL) criado aqui e revogado no cleanup
      setEntry({ blob, url });
      return () => URL.revokeObjectURL(url);
   }, [blob]);
   return blob && entry?.blob === blob ? entry.url : null;
}
