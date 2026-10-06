import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchInputProps
  extends Omit<React.ComponentPropsWithoutRef<typeof Input>, "type"> {
  /** Classe do contêiner que posiciona o ícone. */
  containerClassName?: string;
}

const SearchInput = React.forwardRef<
  React.ElementRef<typeof Input>,
  SearchInputProps
>(({ containerClassName, className, ...props }, ref) => (
  <div className={cn("relative w-full max-w-sm", containerClassName)}>
    <Search
      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      aria-hidden
    />
    <Input ref={ref} type="search" className={cn("pl-9", className)} {...props} />
  </div>
));
SearchInput.displayName = "SearchInput";

export { SearchInput };
