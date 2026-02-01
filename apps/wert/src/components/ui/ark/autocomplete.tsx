'use client'

import { forwardRef, useState, useMemo, useEffect, useCallback } from 'react'
import { Combobox as ArkCombobox, createListCollection } from '@ark-ui/react/combobox'
import { Portal } from '@ark-ui/react/portal'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDebouncedCallback } from 'use-debounce'

interface AutoCompleteItem {
  value: string
  label: string
  subLabel?: string
  data?: unknown
}

interface AutoCompleteInputProps {
  value: string
  onValueChange?: (value: string) => void
  onSelect?: (item: AutoCompleteItem) => void
  fetcher: (query: string) => Promise<AutoCompleteItem[]>
  placeholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
}

const AutoCompleteInput = forwardRef<HTMLDivElement, AutoCompleteInputProps>(
  ({
    value,
    onValueChange,
    onSelect,
    fetcher,
    placeholder = "搜索...",
    emptyText = "无匹配结果",
    className,
    disabled
  }, ref) => {
    const [inputValue, setInputValue] = useState(value)
    const [items, setItems] = useState<AutoCompleteItem[]>([])
    const [loading, setLoading] = useState(false)

    const collection = useMemo(() => {
      return createListCollection({
        items,
        itemToValue: (item: AutoCompleteItem) => item.value,
        itemToString: (item: AutoCompleteItem) => item.label,
      })
    }, [items])

    // Sync external value
    useEffect(() => {
      setInputValue(value)
    }, [value])

    // Debounced search
    const debouncedSearch = useDebouncedCallback(
      async (query: string) => {
        if (!query.trim()) {
          setItems([])
          setLoading(false)
          return
        }
        try {
          const results = await fetcher(query)
          setItems(results)
        } catch {
          setItems([])
        } finally {
          setLoading(false)
        }
      },
      300
    )

    const handleInputChange = useCallback((details: { inputValue: string }) => {
      const newValue = details.inputValue
      setInputValue(newValue)
      onValueChange?.(newValue)
      setLoading(true)
      debouncedSearch(newValue)
    }, [onValueChange, debouncedSearch])

    const handleValueChange = useCallback((details: { value: string[]; items: AutoCompleteItem[] }) => {
      if (details.items.length > 0) {
        const item = details.items[0]
        onSelect?.(item)
        onValueChange?.(item.value)
        setInputValue(item.value)
      }
    }, [onSelect, onValueChange])

    return (
      <ArkCombobox.Root
        ref={ref}
        collection={collection}
        inputValue={inputValue}
        onInputValueChange={handleInputChange}
        onValueChange={handleValueChange}
        disabled={disabled}
        allowCustomValue
        openOnClick={false}
        className={cn("relative", className)}
      >
        <ArkCombobox.Control className="relative">
          <ArkCombobox.Input
            placeholder={placeholder}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
              "ring-offset-background transition-colors",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "touch-manipulation"
            )}
          />
          <ArkCombobox.Trigger className="absolute right-3 top-1/2 -translate-y-1/2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin opacity-50" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            )}
          </ArkCombobox.Trigger>
        </ArkCombobox.Control>

        <Portal>
          <ArkCombobox.Positioner>
            <ArkCombobox.Content
              className={cn(
                "z-50 max-h-[300px] min-w-[200px] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
                "animate-in fade-in-0 zoom-in-95"
              )}
            >
              <ArkCombobox.ItemGroup className="overflow-y-auto p-1">
                {items.length === 0 && inputValue.trim() && !loading ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {emptyText}
                  </div>
                ) : (
                  items.map((item) => (
                    <ArkCombobox.Item
                      key={item.value}
                      item={item}
                      className={cn(
                        "relative flex flex-col cursor-default select-none rounded-sm px-2 py-1.5 text-sm outline-none",
                        "transition-colors",
                        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
                        "touch-manipulation"
                      )}
                    >
                      <ArkCombobox.ItemText>{item.label}</ArkCombobox.ItemText>
                      {item.subLabel && (
                        <span className="text-xs text-muted-foreground">{item.subLabel}</span>
                      )}
                      <ArkCombobox.ItemIndicator className="absolute right-2 top-1/2 -translate-y-1/2 flex h-3.5 w-3.5 items-center justify-center">
                        <Check className="h-4 w-4" />
                      </ArkCombobox.ItemIndicator>
                    </ArkCombobox.Item>
                  ))
                )}
              </ArkCombobox.ItemGroup>
            </ArkCombobox.Content>
          </ArkCombobox.Positioner>
        </Portal>
      </ArkCombobox.Root>
    )
  }
)
AutoCompleteInput.displayName = 'AutoCompleteInput'

export { AutoCompleteInput, type AutoCompleteItem }
