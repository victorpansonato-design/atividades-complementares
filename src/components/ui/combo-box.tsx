import * as React from "react";
import { Check, ChevronsUpDown, Loader2, type LucideIcon } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Normaliza removendo acentos para busca insensível a diacríticos (pt-BR). */
function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export interface ComboBoxOption {
  value: string | number;
  label: string;
  badge?: string;
}

export interface ComboBoxProps {
  options: ComboBoxOption[];
  value?: string | number | null;
  onValueChange: (value: string | number, option: ComboBoxOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loadingText?: string;
  className?: string;
  disabled?: boolean;
  isLoading?: boolean;
  icon?: LucideIcon;
}

export function ComboBox({
  options,
  value,
  onValueChange,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  emptyText = "Nenhum resultado encontrado.",
  loadingText = "Carregando...",
  className,
  disabled = false,
  isLoading = false,
  icon: Icon,
}: ComboBoxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const optionsMap = React.useMemo(() => {
    const map = new Map<string | number, ComboBoxOption>();
    options.forEach((o) => map.set(o.value, o));
    return map;
  }, [options]);

  const filtered = React.useMemo(() => {
    if (!search) return options;
    const q = normalizeText(search);
    return options.filter(
      (o) =>
        normalizeText(o.label).includes(q) ||
        (o.badge ? normalizeText(o.badge).includes(q) : false)
    );
  }, [options, search]);

  const selected = value == null ? null : optionsMap.get(value) ?? null;

  const handleSelect = React.useCallback(
    (current: string) => {
      const option = optionsMap.get(current) ?? optionsMap.get(Number(current));
      if (option) {
        onValueChange(option.value, option);
        setOpen(false);
      }
    },
    [optionsMap, onValueChange]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn(
            "h-auto min-h-9 w-full min-w-0 max-w-full justify-between overflow-hidden py-2",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
            {isLoading ? (
              <>
                <Loader2 className="size-4 shrink-0 animate-spin" />
                <span className="text-sm">{loadingText}</span>
              </>
            ) : selected ? (
              <>
                {Icon ? <Icon className="size-4 shrink-0" /> : null}
                <span className="min-w-0 flex-1 truncate font-medium" title={selected.label}>
                  {selected.label}
                </span>
                {selected.badge ? (
                  <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {selected.badge}
                  </span>
                ) : null}
              </>
            ) : (
              <>
                {Icon ? <Icon className="size-4 shrink-0" /> : null}
                <span className="truncate">{placeholder}</span>
              </>
            )}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> {loadingText}
              </div>
            ) : filtered.length === 0 ? (
              <CommandEmpty>{emptyText}</CommandEmpty>
            ) : (
              filtered.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value.toString()}
                  onSelect={handleSelect}
                  className="flex cursor-pointer items-center gap-2 rounded p-2.5 font-medium"
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="line-clamp-3 flex-1 break-words text-left">
                    {option.label}
                  </span>
                  {option.badge ? (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {option.badge}
                    </span>
                  ) : null}
                </CommandItem>
              ))
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
