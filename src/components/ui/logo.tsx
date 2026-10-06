import { cn } from "@/lib/utils";
import * as React from "react";

export interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Nome do sistema (linha principal). */
  title?: string;
  /** Linha institucional. */
  subtitle?: string;
  /** Imagem de marca opcional. Sem ela, usa o monograma. */
  src?: string;
  /** Letra(s) do monograma. Derivado do título quando omitido. */
  monogram?: string;
  /** Só a marca, sem o bloco de texto. */
  collapsed?: boolean;
}

const Logo = React.forwardRef<HTMLDivElement, LogoProps>(
  (
    {
      title = "Design System",
      subtitle = "Grupo Anchieta",
      src,
      monogram,
      collapsed = false,
      className,
      ...props
    },
    ref
  ) => {
    const mark = (monogram ?? title.trim()[0] ?? "A").toUpperCase();
    return (
      <div ref={ref} className={cn("flex items-center gap-3", className)} {...props}>
        <div
          className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md bg-primary text-primary-foreground shadow-sm"
          aria-hidden
        >
          {src ? (
            <img src={src} alt="" className="size-full object-contain" />
          ) : (
            <span className="font-display text-[15px] font-semibold leading-none">{mark}</span>
          )}
        </div>
        {collapsed ? (
          <span className="sr-only">
            {title} - {subtitle}
          </span>
        ) : (
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-display text-[14px] font-medium text-foreground">
              {title}
            </span>
            <span className="truncate text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {subtitle}
            </span>
          </div>
        )}
      </div>
    );
  }
);
Logo.displayName = "Logo";

export { Logo };

