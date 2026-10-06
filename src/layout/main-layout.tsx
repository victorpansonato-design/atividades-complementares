import { useEffect, useRef } from "react";

import { User } from "lucide-react";
import { motion } from "motion/react";
import { Outlet, useLocation } from "react-router-dom";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useSession } from "@/hooks/use-session";
import { AppSidebar } from "@/layout/app-sidebar";
import { MobileTabBar } from "@/layout/mobile-tab-bar";
import { useMobileTabBarVisible } from "@/layout/use-mobile-tab-bar";
import { NavTitle } from "@/layout/nav-title";
import { PortalReturnLink } from "@/layout/portal-return";

/**
 * Shell oficial do template adaptado ao aluno. A feature não depende dele: dentro
 * do portal, este shell externo pode ser retirado sem reescrever as telas.
 */
export default function MainLayout() {
   const { user, isMock } = useSession();
   const { pathname } = useLocation();
   const canvasRef = useRef<HTMLDivElement>(null);
   const tabBarVisible = useMobileTabBarVisible();

   // Reposicionar o scroll após a mudança de rota.
   useEffect(() => {
      canvasRef.current?.scrollTo({ top: 0 });
   }, [pathname]);

   return (
      <SidebarProvider className="h-svh overflow-hidden">
         <AppSidebar />

         <SidebarInset className="min-w-0 overflow-hidden bg-canvas text-canvas-foreground md:border md:border-border md:peer-data-[variant=inset]:shadow-elevated">
            <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 sm:gap-3 sm:px-5">
               <SidebarTrigger
                  className="size-11 cursor-pointer text-muted-foreground hover:text-foreground md:size-8"
                  aria-label="Abrir ou fechar menu"
               />
               <div className="h-5 w-px bg-border" aria-hidden />
               <NavTitle />
               <div className="ml-auto flex items-center gap-1 sm:gap-3">
                  <div className="hidden flex-col items-end text-muted-foreground lg:flex">
                     <div className="flex items-center gap-1 text-xs">
                        <User className="h-3 w-3" aria-hidden />
                        <span>{user?.nome}</span>
                     </div>
                     {user ? (
                        <div className="text-[0.65rem] leading-tight">
                           RA {user.identificador}
                           {isMock ? " · dados fictícios" : ""}
                        </div>
                     ) : null}
                  </div>
                  <PortalReturnLink iconOnlyOnMobile />
               </div>
            </header>

            <div ref={canvasRef} className="flex-1 overflow-y-auto overscroll-contain scroll-pb-28 scroll-pt-4">
               <div className={tabBarVisible ? "px-4 pb-28 pt-4 md:px-8 md:pb-12 md:pt-2" : "px-4 pb-12 pt-4 md:px-8 md:pt-2"}>
                  <motion.div
                     key={pathname}
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ duration: 0.35, ease: "easeOut" }}
                     className="mx-auto max-w-6xl"
                  >
                     <Outlet />
                  </motion.div>
               </div>
            </div>
         </SidebarInset>
         <MobileTabBar />
      </SidebarProvider>
   );
}
