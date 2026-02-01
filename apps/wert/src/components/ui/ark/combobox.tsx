'use client'

import { Combobox as ArkCombobox, createListCollection } from '@ark-ui/react/combobox'
import { Portal } from '@ark-ui/react/portal'
import { forwardRef, useState, useMemo } from 'react'
import { Check, ChevronsUpDown, Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ComboboxItem {
  value: string
  label: string
  disabled?: boolean
}

interface ComboboxProps {
  items: ComboboxItem[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  loading?: boolean
  onInputChange?: (value: string) => void
}

const Combobox = forwardRef<HTMLDivElement, ComboboxProps>(
  ({
    items,
    value,
    onValueChange,
    placeholder = "选择...",
    searchPlaceholder = "搜索...",
    emptyText = "无匹配结果",
    className,
    disabled,
    loading,
    onInputChange
  }, ref) => {
    const [inputValue, setInputValue] = useState('')

    const collection = useMemo(() => {
      return createListCollection({
        items,
        itemToValue: (item: ComboboxItem) => item.value,
        itemToString: (item: ComboboxItem) => item.label,
      })
    }, [items])

    const filteredItems = useMemo(() => {
      if (!inputValue) return items
      return items.filter(item =>
        item.label.toLowerCase().includes(inputValue.toLowerCase())
      )
    }, [items, inputValue])

    const handleInputChange = (details: { inputValue: string }) => {
      setInputValue(details.inputValue)
      onInputChange?.(details.inputValue)
    }

    const handleValueChange = (details: { value: string[] }) => {
      if (details.value.length > 0) {
        onValueChange?.(details.value[0])
      }
    }

    const selectedItem = items.find(item => item.value === value)

    return (
      <ArkCombobox.Root
        ref={ref}
        collection={collection}
        value={value ? [value] : []}
        onValueChange={handleValueChange}
        onInputValueChange={handleInputChange}
        disabled={disabled}
        openOnClick
        className={cn("relative", className)}
      >
        <ArkCombobox.Control className="relative">
          <ArkCombobox.Trigger
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm",
              "ring-offset-background transition-colors",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "touch-manipulation"
            )}
          >
            <span className={cn(!selectedItem && "text-muted-foreground")}>
              {selectedItem?.label || placeholder}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
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
              {/* Search input */}
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <ArkCombobox.Input
                  placeholder={searchPlaceholder}
                  className={cn(
                    "flex h-10 w-full bg-transparent py-3 text-sm outline-none",
                    "placeholder:text-muted-foreground",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                />
                {loading && <Loader2 className="h-4 w-4 animate-spin opacity-50" />}
              </div>

              {/* Items list */}
              <ArkCombobox.ItemGroup className="max-h-[200px] overflow-y-auto p-1">
                {filteredItems.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {emptyText}
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <ArkCombobox.Item
                      key={item.value}
                      item={item}
                      className={cn(
                        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                        "transition-colors",
                        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
                        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                        "touch-manipulation"
                      )}
                    >
                      <ArkCombobox.ItemText>{item.label}</ArkCombobox.ItemText>
                      <ArkCombobox.ItemIndicator className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
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
Combobox.displayName = 'Combobox'

export { Combobox, type ComboboxItem }
