import { CircleHelp, ClipboardList, Luggage, Plus, type LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useMobileTabBarVisible } from "@/layout/use-mobile-tab-bar";
import { cn } from "@/lib/utils";

interface Tab {
   to: string;
   label: string;
   icon: LucideIcon;
   end?: boolean;
   primary?: boolean;
}

const TABS: Tab[] = [
   { to: "/", label: "Minhas horas", icon: ClipboardList, end: true },
   { to: "/solicitar", label: "Solicitar", icon: Plus, primary: true },
   { to: "/bagagens", label: "Bagagens", icon: Luggage },
   { to: "/ajuda", label: "Ajuda", icon: CircleHelp },
];

/**
 * Navegação inferior do celular: tudo ao alcance do polegar, sem abrir menu.
 * No desktop a barra lateral cumpre esse papel.
 */
export function MobileTabBar() {
   const visible = useMobileTabBarVisible();
   if (!visible) return null;
   return (
      <nav
         aria-label="Navegação principal"
         className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-canvas pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_-6px_rgb(0_0_0/0.12)] [-webkit-tap-highlight-color:transparent] md:hidden"
      >
         <ul className="mx-auto grid max-w-md grid-cols-4">
            {TABS.map(tab => (
               <li key={tab.to}>
                  <NavLink
                     to={tab.to}
                     end={tab.end}
                     className={({ isActive }) =>
                        cn(
                           "relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                           isActive ? "text-primary" : "text-muted-foreground active:text-foreground",
                        )
                     }
                  >
                     {({ isActive }) => (
                        <>
                           {isActive ? (
                              <span className="absolute inset-x-5 top-0 h-0.5 rounded-b-full bg-(--brand-yellow)" aria-hidden />
                           ) : null}
                           <span
                              className={cn(
                                 "grid place-items-center rounded-full",
                                 tab.primary ? "size-8 bg-primary text-primary-foreground shadow-sm" : "size-6",
                              )}
                              aria-hidden
                           >
                              <tab.icon className="size-5" />
                           </span>
                           <span>{tab.label}</span>
                        </>
                     )}
                  </NavLink>
               </li>
            ))}
         </ul>
      </nav>
   );
}
