import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  value?: Date;
  onChange?: (date?: Date) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Formata a data exibida no gatilho. Padrão: data local (pt-BR via toLocaleDateString). */
  format?: (date: Date) => string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Selecione uma data",
  disabled = false,
  className,
  format,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (date?: Date) => {
    onChange?.(date);
    setOpen(false);
  };

  const label = value
    ? (format ?? ((d: Date) => d.toLocaleDateString()))(value)
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          {label}
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          captionLayout="dropdown"
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  );
}
