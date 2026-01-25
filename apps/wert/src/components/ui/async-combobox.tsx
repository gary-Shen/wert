"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useDebounce } from "use-debounce"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxItem {
  value: string
  label: string
  subLabel?: string
  data?: any
}

interface AsyncComboboxProps {
  value?: string
  onSelect: (value: string, item?: ComboboxItem) => void
  fetcher: (query: string) => Promise<ComboboxItem[]>
  placeholder?: string
  className?: string
  emptyText?: string
}

export function AsyncCombobox({
  value,
  onSelect,
  fetcher,
  placeholder = "Search...",
  className,
  emptyText = "No results found.",
}: AsyncComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [debouncedQuery] = useDebounce(query, 300)
  const [loading, setLoading] = React.useState(false)
  const [options, setOptions] = React.useState<ComboboxItem[]>([])

  // Cache the label for the selected value to display it even if options change
  const [selectedLabel, setSelectedLabel] = React.useState<string>("")

  React.useEffect(() => {
    let mounted = true;

    if (!debouncedQuery) {
      setOptions([]);
      return;
    }

    const loadOptions = async () => {
      setLoading(true);
      try {
        const results = await fetcher(debouncedQuery);
        if (mounted) setOptions(results);
      } catch (err) {
        console.error("Combobox fetch error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadOptions();

    return () => { mounted = false };
  }, [debouncedQuery, fetcher]);

  const handleSelect = (currentValue: string, item: ComboboxItem) => {
    onSelect(currentValue, item)
    setSelectedLabel(item.label)
    setOpen(false)
  }

  // Display logic: 
  // If we have a selected value, we prioritize showing its label if known (from `selectedLabel` or initial `value`).
  // But usually `value` prop is just the ID (ticker). We want to show "Tencent (700.HK)".
  // If `value` comes in but `selectedLabel` is empty, just show `value` as fallback.
  // The parent should ideally manage the display text if it wants full control, but here we try our best.

  const displayText = selectedLabel || value || placeholder;
  const isSelected = !!value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className, !value && "text-muted-foreground")}
        >
          {value ? (selectedLabel || value) : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground flex justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
            {!loading && options.length === 0 && query !== "" && (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}
            {!loading && options.map((item) => (
              <CommandItem
                key={item.value}
                value={item.value}
                onSelect={() => handleSelect(item.value, item)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === item.value ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span>{item.label}</span>
                  {item.subLabel && <span className="text-xs text-muted-foreground">{item.subLabel}</span>}
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
