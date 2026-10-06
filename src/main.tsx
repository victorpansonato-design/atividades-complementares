import { MockSessionProvider } from "@/providers/mock-session-provider";
import { QueryProvider } from "@/providers/query-provider";
import AppRoute from "@/routes/app.routes";
import "@/stores/theme.store";
import { MotionConfig } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

createRoot(document.getElementById("root")!).render(
   <StrictMode>
      <MotionConfig reducedMotion="user">
         <QueryProvider>
            <MockSessionProvider>
               <AppRoute />
            </MockSessionProvider>
         </QueryProvider>
      </MotionConfig>
   </StrictMode>,
);
