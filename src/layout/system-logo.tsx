import iconHeader from "@/assets/icons/icone_header.png";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { ITEM_MOTION_TRANSITION, SECTION_MOTION_TRANSITION } from "@/layout/sidebar/sidebar.constants";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { Link } from "react-router-dom";

export function SystemLogo() {
   const { isMobile, setOpenMobile, state } = useSidebar();
   const collapsed = !isMobile && state === "collapsed";

   const handleNavigate = () => {
      if (isMobile) setOpenMobile(false);
   };

   return (
      <motion.div
         layout
         initial={false}
         animate={{ paddingLeft: collapsed ? 6 : 12, paddingRight: collapsed ? 6 : 12 }}
         transition={SECTION_MOTION_TRANSITION}
         className="flex min-h-15 items-center pb-2 pt-4"
      >
         <Link to="/" aria-label="Ir para o acompanhamento" onClick={handleNavigate}>
            <motion.span
               layout="position"
               transition={ITEM_MOTION_TRANSITION}
               className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md shadow-sm"
            >
               <img src={iconHeader} alt="" width={300} height={300} className="size-full object-contain" />
            </motion.span>
         </Link>

         <AnimatePresence initial={false} mode="popLayout">
            {!collapsed && (
               <motion.div
                  key="system-name"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={ITEM_MOTION_TRANSITION}
                  className="ml-3 flex min-w-0 flex-col leading-tight"
               >
                  <span className="font-display text-[14px] font-medium text-foreground">Atividades Complementares</span>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Grupo Anchieta</span>
               </motion.div>
            )}
         </AnimatePresence>

         {isMobile && (
            <Button
               variant="ghost"
               size="icon"
               className="ml-auto size-8 text-muted-foreground [&_svg]:size-4"
               aria-label="Fechar menu"
               onClick={() => setOpenMobile(false)}
            >
               <X />
            </Button>
         )}
      </motion.div>
   );
}
