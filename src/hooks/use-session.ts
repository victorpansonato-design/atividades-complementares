import { SessionContext } from "@/contexts/session/session-context";
import { useContext } from "react";

export function useSession() {
   const context = useContext(SessionContext);
   if (!context) {
      throw new Error("useSession must be used within a session provider");
   }
   return context;
}
