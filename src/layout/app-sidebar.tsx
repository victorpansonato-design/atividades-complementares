import { AnimatePresence, motion } from "motion/react";
import { useCallback } from "react";
import { useLocation } from "react-router-dom";

import {
   Check,
   ChevronUp,
   CircleHelp,
   ClipboardList,
   LaptopMinimal,
   Luggage,
   type LucideIcon,
   Moon,
   Plus,
   Settings2,
   Sun,
} from "lucide-react";

import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
   Sidebar,
   SidebarContent,
   SidebarFooter,
   SidebarGroup,
   SidebarGroupContent,
   SidebarMenu,
   SidebarRail,
   useSidebar,
} from "@/components/ui/sidebar";
import { DemoPanelTrigger } from "@/features/atividades-complementares";
import { useSession } from "@/hooks/use-session";
import { ITEM_MOTION_TRANSITION, isPathActive } from "@/layout/sidebar/sidebar.constants";
import { SidebarNavigationItem, SidebarSectionLabel } from "@/layout/sidebar/sidebar-navigation-item";
import { type Theme, useThemeStore } from "@/stores/theme.store";

import { SystemLogo } from "./system-logo";

interface MenuItem {
   label: string;
   path: string;
   icon: LucideIcon;
   exact?: boolean;
}

interface MenuSection {
   label: string;
   items: MenuItem[];
}

interface UserCardProps {
   collapsed: boolean;
   name: string;
   identifier: string;
   detail?: string | null;
   isMock: boolean;
}

const MENU: MenuSection[] = [
   {
      label: "Atividades Complementares",
      items: [
         { label: "Minhas horas", path: "/", icon: ClipboardList, exact: true },
         { label: "Solicitar horas", path: "/solicitar", icon: Plus },
         { label: "Ajuda e regulamento", path: "/ajuda", icon: CircleHelp },
         { label: "Bagagens", path: "/bagagens", icon: Luggage },
      ],
   },
];

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
   { value: "light", label: "Claro", icon: Sun },
   { value: "dark", label: "Escuro", icon: Moon },
   { value: "system", label: "Sistema", icon: LaptopMinimal },
];

const THEME_LABEL: Record<Theme, string> = {
   light: "Claro",
   dark: "Escuro",
   system: "Sistema",
};

function getInitials(name: string): string {
   return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() ?? "")
      .join("");
}

export function AppSidebar() {
   const { pathname } = useLocation();
   const { isMobile, setOpenMobile, state } = useSidebar();
   const { user, isMock } = useSession();
   const collapsed = !isMobile && state === "collapsed";

   const handleNavigate = useCallback(() => {
      if (isMobile) setOpenMobile(false);
   }, [isMobile, setOpenMobile]);

   return (
      <Sidebar collapsible="icon" variant="inset">
         <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex h-full min-h-0 flex-col"
         >
            <SystemLogo />

            <SidebarContent className="gap-4 px-2 py-4 group-data-[collapsible=icon]:px-1">
               <nav aria-label="Navegação principal" className="flex flex-col gap-4">
                  {MENU.map(section => (
                     <SidebarGroup key={section.label} className="px-2 py-1 group-data-[collapsible=icon]:px-0">
                        <SidebarSectionLabel collapsed={collapsed}>{section.label}</SidebarSectionLabel>
                        <SidebarGroupContent>
                           <SidebarMenu>
                              {section.items.map(item => (
                                 <SidebarNavigationItem
                                    key={item.path}
                                    active={isPathActive(pathname, item.path, item.exact)}
                                    collapsed={collapsed}
                                    icon={item.icon}
                                    isMobile={isMobile}
                                    label={item.label}
                                    onNavigate={handleNavigate}
                                    path={item.path}
                                 />
                              ))}
                           </SidebarMenu>
                        </SidebarGroupContent>
                     </SidebarGroup>
                  ))}
               </nav>
            </SidebarContent>

            <SidebarFooter className="gap-2 border-t border-sidebar-border p-3 group-data-[collapsible=icon]:px-1.5">
               {user ? (
                  <UserCard collapsed={collapsed} name={user.nome} identifier={user.identificador} detail={user.detalhe} isMock={isMock} />
               ) : null}
               <PreferencesMenu collapsed={collapsed} />
               <DemoPanelTrigger
                  compact={collapsed}
                  className="group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
               />
            </SidebarFooter>
         </motion.div>

         <SidebarRail />
      </Sidebar>
   );
}

function UserCard({ collapsed, name, identifier, detail, isMock }: UserCardProps) {
   return (
      <motion.div
         layout
         transition={ITEM_MOTION_TRANSITION}
         className="flex items-center gap-3 rounded-md bg-sidebar-accent/40 px-2.5 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
      >
         <motion.div
            layout="position"
            transition={ITEM_MOTION_TRANSITION}
            className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"
            aria-hidden
         >
            <span className="text-xs font-semibold">{getInitials(name)}</span>
         </motion.div>

         <AnimatePresence initial={false} mode="popLayout">
            {!collapsed && (
               <motion.div
                  key="user-details"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={ITEM_MOTION_TRANSITION}
                  className="flex min-w-0 flex-1 items-center gap-2"
               >
                  <div className="flex min-w-0 flex-1 flex-col leading-tight">
                     <span className="truncate text-sm font-medium text-sidebar-foreground">{name}</span>
                     <span className="truncate text-[11px] text-muted-foreground">
                        RA {identifier}
                        {detail ? ` · ${detail}` : ""}
                     </span>
                     {isMock ? <span className="truncate text-[10px] text-muted-foreground/80">Aluno fictício (demonstração)</span> : null}
                  </div>
               </motion.div>
            )}
         </AnimatePresence>
      </motion.div>
   );
}

function PreferencesMenu({ collapsed }: { collapsed: boolean }) {
   const theme = useThemeStore(store => store.theme);
   const setTheme = useThemeStore(store => store.setTheme);
   const CurrentIcon = THEME_OPTIONS.find(option => option.value === theme)?.icon ?? LaptopMinimal;

   return (
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <button
               type="button"
               className="group flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
               title="Preferências"
            >
               <motion.span layout="position" transition={ITEM_MOTION_TRANSITION} className="grid size-4 shrink-0 place-items-center">
                  <Settings2 className="size-3.5" />
               </motion.span>

               <AnimatePresence initial={false} mode="popLayout">
                  {!collapsed && (
                     <motion.span
                        key="preference-label"
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -5 }}
                        transition={ITEM_MOTION_TRANSITION}
                        className="flex min-w-0 flex-1 items-center gap-2"
                     >
                        <span className="text-left">Preferências</span>
                        <span className="ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.06em] text-muted-foreground/80">
                           <CurrentIcon className="size-3" />
                           {THEME_LABEL[theme]}
                        </span>
                        <ChevronUp className="size-3 text-muted-foreground" />
                     </motion.span>
                  )}
               </AnimatePresence>
            </button>
         </DropdownMenuTrigger>
         <DropdownMenuContent side="top" align="start" className="w-[220px]">
            <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
               Aparência
            </DropdownMenuLabel>
            {THEME_OPTIONS.map(option => {
               const Icon = option.icon;
               const active = theme === option.value;
               return (
                  <DropdownMenuItem key={option.value} onSelect={() => setTheme(option.value)} className="flex items-center gap-2">
                     <Icon className="size-4 text-muted-foreground" />
                     <span className="flex-1">{option.label}</span>
                     {active ? <Check className="size-3.5 text-primary" /> : null}
                  </DropdownMenuItem>
               );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="text-[11px] text-muted-foreground">
               Mais preferências em breve
            </DropdownMenuItem>
         </DropdownMenuContent>
      </DropdownMenu>
   );
}
