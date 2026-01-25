"use client"

import * as React from "react"
import { useDebounce } from "use-debounce"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover"

export interface AutoCompleteItem {
  value: string
  label: string
  subLabel?: string
  data?: any
}

interface AutoCompleteInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'onSelect'> {
  value: string
  onValueChange: (value: string) => void
  fetcher: (query: string) => Promise<AutoCompleteItem[]>
  onSelect?: (item: AutoCompleteItem) => void
  emptyText?: string
}

export function AutoCompleteInput({
  value,
  onValueChange,
  fetcher,
  onSelect,
  emptyText = "No results found.",
  className,
  ...props
}: AutoCompleteInputProps) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [options, setOptions] = React.useState<AutoCompleteItem[]>([])
  const [debouncedValue] = useDebounce(value, 300)

  React.useEffect(() => {
    let mounted = true;
    if (!debouncedValue) {
      setOptions([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetcher(debouncedValue);
        if (mounted) setOptions(res);
      } catch (e) {
        console.error("AutoComplete fetch error:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [debouncedValue, fetcher]);

  const handleSelect = (item: AutoCompleteItem) => {
    onValueChange(item.value);
    if (onSelect) onSelect(item);
    setOpen(false);
  };

  return (
    <Popover open={open && (options.length > 0 || loading)} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          value={value}
          onChange={(e) => {
            onValueChange(e.target.value);
            setOpen(true);
          }}
          className={cn(className)}
          {...props}
          onBlur={() => {
            // Keep blur separate to allow interactions
          }}
          onFocus={() => {
            if (value) setOpen(true);
          }}
        />
      </PopoverAnchor>
      <PopoverContent
        className="p-0 w-[--radix-popover-trigger-width] z-[200] pointer-events-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
        align="start"
      >
        <div className="max-h-[300px] overflow-y-auto p-1">
          {loading && (
            <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
            </div>
          )}
          {!loading && options.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {emptyText}
            </div>
          )}
          {!loading && options.map((item) => (
            <div
              key={item.value}
              className="cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground flex flex-col group"
              onMouseDown={(e) => {
                // Prevent Input blur so we can fire click/select
                e.preventDefault();
              }}
              onClick={() => handleSelect(item)}
            >
              <span className="font-medium group-hover:underline decoration-dotted underline-offset-4 decoration-transparent transition-all">{item.label}</span>
              {item.subLabel && <span className="text-xs text-muted-foreground">{item.subLabel}</span>}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
