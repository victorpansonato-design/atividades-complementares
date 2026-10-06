import { SidebarGroupLabel, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ITEM_MOTION_TRANSITION, SECTION_MOTION_TRANSITION } from "./sidebar.constants";

interface SidebarNavigationItemProps {
   active: boolean;
   collapsed: boolean;
   icon: LucideIcon;
   isMobile: boolean;
   label: string;
   onNavigate: () => void;
   path: string;
}

const MENU_ITEM_CLASSES = "group relative rounded-md transition-colors duration-150";
const ACTIVE_MENU_ITEM_CLASSES = "bg-canvas! font-medium text-primary! shadow-xs hover:bg-canvas! hover:text-primary!";
const INACTIVE_MENU_ITEM_CLASSES = "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground";

export function SidebarSectionLabel({ children, collapsed }: { children: ReactNode; collapsed: boolean }) {
   return (
      <AnimatePresence initial={false} mode="popLayout">
         {!collapsed && (
            <motion.div
               key="section-label"
               initial={{ height: 0, opacity: 0 }}
               animate={{ height: 28, opacity: 1 }}
               exit={{ height: 0, opacity: 0 }}
               transition={SECTION_MOTION_TRANSITION}
               className="overflow-hidden"
            >
               <SidebarGroupLabel className="h-7 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {children}
               </SidebarGroupLabel>
            </motion.div>
         )}
      </AnimatePresence>
   );
}

export function SidebarNavigationItem({ active, collapsed, icon: Icon, isMobile, label, onNavigate, path }: SidebarNavigationItemProps) {
   return (
      <SidebarMenuItem>
         <SidebarMenuButton
            asChild
            isActive={active}
            tooltip={label}
            showTooltipWhenExpanded
            className={cn(MENU_ITEM_CLASSES, active ? ACTIVE_MENU_ITEM_CLASSES : INACTIVE_MENU_ITEM_CLASSES, isMobile && "h-11")}
         >
            <Link to={path} aria-current={active ? "page" : undefined} onClick={onNavigate}>
               <AnimatePresence initial={false}>
                  {active && (
                     <motion.span
                        key="active-indicator"
                        aria-hidden
                        initial={{ opacity: 0, scaleY: 0.35 }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        exit={{ opacity: 0, scaleY: 0.35 }}
                        transition={ITEM_MOTION_TRANSITION}
                        className="absolute left-0 top-1/2 h-4 w-0.75 -translate-y-1/2 rounded-r-sm bg-(--brand-yellow) group-data-[collapsible=icon]:h-5"
                     />
                  )}
               </AnimatePresence>

               <motion.span
                  layout="position"
                  aria-hidden
                  initial={false}
                  animate={{ scale: collapsed ? 1.05 : 1 }}
                  transition={ITEM_MOTION_TRANSITION}
                  className={cn(
                     "grid size-5 shrink-0 place-items-center transition-colors",
                     active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                  )}
               >
                  <Icon className="size-4" />
               </motion.span>

               <AnimatePresence initial={false} mode="popLayout">
                  {!collapsed && (
                     <motion.span
                        key="item-label"
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -5 }}
                        transition={ITEM_MOTION_TRANSITION}
                        className="min-w-0 flex-1 truncate whitespace-nowrap"
                     >
                        {label}
                     </motion.span>
                  )}
               </AnimatePresence>
            </Link>
         </SidebarMenuButton>
      </SidebarMenuItem>
   );
}
