import { useCallback } from "react";
import { getGateway } from "../api/gateway";

/**
 * Guarda/descarta os BYTES de um comprovante pelo gateway (IndexedDB no mock;
 * upload no backend real). Os metadados ficam no formulário.
 */
export function useAttachmentStorage() {
   const store = useCallback((id: string, file: Blob) => getGateway().storeAttachment(id, file), []);
   const discard = useCallback((id: string) => getGateway().discardAttachment(id), []);
   const exists = useCallback(async (id: string) => (await getGateway().getAttachment(id)) != null, []);
   return { store, discard, exists };
}
