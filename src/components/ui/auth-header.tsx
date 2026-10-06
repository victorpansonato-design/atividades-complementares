import * as React from "react";
import { cn } from "@/lib/utils";

function initialsFrom(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export interface AuthHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Nome do usuário autenticado. */
  name: string;
  /** Rótulo do papel/perfil (ex.: "Administrador"). Exibido como badge. */
  role?: string;
  /** Unidade ou setor. */
  unit?: string;
  /** Iniciais do avatar. Derivadas do nome quando omitidas. */
  initials?: string;
  /** Mostra só o avatar, sem o bloco de nome/papel. */
  compact?: boolean;
}

const AuthHeader = React.forwardRef<HTMLDivElement, AuthHeaderProps>(
  ({ name, role, unit, initials, compact = false, className, ...props }, ref) => {
    const avatar = (initials ?? initialsFrom(name)).slice(0, 2);
    return (
      <div ref={ref} className={cn("flex items-center gap-3", className)} {...props}>
        <div
          className="grid size-9 place-items-center rounded-full border border-border bg-primary-soft text-[13px] font-semibold text-primary"
          aria-hidden
        >
          {avatar}
        </div>
        {compact ? (
          <span className="sr-only">{name}</span>
        ) : (
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-medium text-foreground">{name}</span>
            {(role || unit) && (
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {role ? (
                  <span className="inline-flex items-center rounded-sm bg-primary-soft px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.04em] text-primary">
                    {role}
                  </span>
                ) : null}
                {role && unit ? <span aria-hidden>·</span> : null}
                {unit ? <span className="truncate">{unit}</span> : null}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);
AuthHeader.displayName = "AuthHeader";

export { AuthHeader };
