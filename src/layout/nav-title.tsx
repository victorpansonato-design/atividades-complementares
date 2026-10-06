import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";

import { ChevronRight } from "lucide-react";

interface Crumb {
   label: string;
   to?: string;
   mono?: boolean;
}

interface RouteEntry {
   match: RegExp;
   build: (params: Record<string, string>) => Crumb[];
}

const ROOT: Crumb = { label: "Atividades Complementares", to: "/" };

/**
 * Mapa de breadcrumbs por rota. Adicione novas entradas conforme o sistema cresce.
 * O fallback usa o último segmento da URL como rótulo.
 */
const ROUTES: RouteEntry[] = [
   { match: /^\/?$/, build: () => [{ label: "Atividades Complementares" }] },
   { match: /^\/solicitar\/?$/, build: () => [ROOT, { label: "Solicitar horas" }] },
   { match: /^\/ajuda\/?$/, build: () => [ROOT, { label: "Ajuda" }] },
   { match: /^\/bagagens\/?$/, build: () => [ROOT, { label: "Bagagens" }] },
   {
      match: /^\/pedidos\/([^/]+)\/corrigir\/?$/,
      build: ({ id }) => [ROOT, { label: "Pedido", to: `/pedidos/${id}` }, { label: "Correção" }],
   },
   {
      match: /^\/pedidos\/([^/]+)\/reconsiderar\/?$/,
      build: ({ id }) => [ROOT, { label: "Pedido", to: `/pedidos/${id}` }, { label: "Reconsideração" }],
   },
   { match: /^\/pedidos\/([^/]+)\/?$/, build: () => [ROOT, { label: "Pedido" }] },
];

function titleizeSegment(segment: string): string {
   const text = decodeURIComponent(segment).replace(/[-_]/g, " ");
   return text.charAt(0).toUpperCase() + text.slice(1);
}

export function NavTitle() {
   const { pathname } = useLocation();

   const entry = ROUTES.find(r => r.match.test(pathname));
   const id = entry ? (pathname.match(entry.match)?.[1] ?? "") : "";
   const segments = pathname.split("/").filter(Boolean);
   const crumbs: Crumb[] =
      entry?.build({ id }) ??
      (segments.length ? segments.map(s => ({ label: titleizeSegment(s) })) : [{ label: "Atividades Complementares" }]);

   return (
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center">
         <ol className="flex min-w-0 items-center gap-1.5 text-sm">
            {crumbs.map((c, i) => {
               const last = i === crumbs.length - 1;
               const node =
                  c.to && !last ? (
                     <Link
                        to={c.to}
                        className={
                           "truncate rounded-sm px-1 transition-colors hover:text-foreground " +
                           (c.mono ? "font-mono tabular text-muted-foreground" : "text-muted-foreground")
                        }
                     >
                        {c.label}
                     </Link>
                  ) : (
                     <span
                        aria-current={last ? "page" : undefined}
                        className={
                           "truncate " +
                           (last ? "font-medium text-foreground" : "text-muted-foreground") +
                           (c.mono ? " font-mono tabular" : "")
                        }
                     >
                        {c.label}
                     </span>
                  );

               return (
                  <Fragment key={`${c.label}-${i}`}>
                     {/* No celular só o item atual aparece, para não estourar a largura. */}
                     <li className={"min-w-0 items-center " + (last ? "flex" : "hidden sm:flex")}>{node}</li>
                     {!last ? (
                        <li aria-hidden className="hidden text-muted-foreground/60 sm:block">
                           <ChevronRight className="h-3.5 w-3.5" />
                        </li>
                     ) : null}
                  </Fragment>
               );
            })}
         </ol>
      </nav>
   );
}
