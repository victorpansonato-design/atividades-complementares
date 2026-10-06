import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const emptyStateVariants = cva(
  "flex flex-col items-center rounded-xl border text-center",
  {
    variants: {
      tone: {
        default: "border-dashed border-border bg-surface",
        error: "border-destructive/40 bg-destructive-soft",
      },
      size: {
        sm: "px-6 py-10",
        md: "px-6 py-14",
      },
    },
    defaultVariants: { tone: "default", size: "md" },
  }
);

export interface EmptyStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof emptyStateVariants> {
  title: React.ReactNode;
  hint?: React.ReactNode;
  actions?: React.ReactNode;
  /** Componente de ícone (ex.: um ícone lucide-react). Renderizado decorativo. */
  icon?: React.ComponentType<{ className?: string }>;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ title, hint, actions, icon: Icon, tone = "default", size, className, ...props }, ref) => {
    const isError = tone === "error";
    return (
      <div
        ref={ref}
        role={isError ? "alert" : undefined}
        className={cn(emptyStateVariants({ tone, size }), className)}
        {...props}
      >
        {Icon ? (
          <span
            className={cn(
              "mb-4 grid size-12 place-items-center rounded-full border bg-card",
              isError ? "border-destructive/40" : "border-border"
            )}
            aria-hidden
          >
            <Icon className={cn("size-5", isError ? "text-destructive" : "text-muted-foreground")} />
          </span>
        ) : null}
        <p
          className={cn(
            "font-display text-[15px] font-medium",
            isError ? "text-destructive" : "text-foreground"
          )}
        >
          {title}
        </p>
        {hint ? (
          <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">{hint}</p>
        ) : null}
        {actions ? (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{actions}</div>
        ) : null}
      </div>
    );
  }
);
EmptyState.displayName = "EmptyState";

export { EmptyState, emptyStateVariants };
