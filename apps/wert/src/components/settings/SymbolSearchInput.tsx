'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/ark/input'
import { useDebouncedCallback } from 'use-debounce'
import { Loader2, Search, Check } from 'lucide-react'

interface SearchResult {
  symbol: string
  name: string
  englishName?: string
  assetType: string
  pinyinAbbr?: string
}

interface PriceInfo {
  price: number
  currency: string
  date: string
  stale: boolean
}

interface SymbolSearchInputProps {
  value: string
  onChange: (symbol: string) => void
  onSelect?: (result: SearchResult | null) => void
  onPriceLoaded?: (price: PriceInfo | null) => void
  placeholder?: string
  className?: string
}

export function SymbolSearchInput({
  value,
  onChange,
  onSelect,
  onPriceLoaded,
  placeholder = '输入代码或名称搜索',
  className,
}: SymbolSearchInputProps) {
  const [isSearching, setIsSearching] = useState(false)
  const [isPriceLoading, setIsPriceLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [price, setPrice] = useState<PriceInfo | null>(null)

  // 防抖搜索
  const debouncedSearch = useDebouncedCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setResults([])
      setShowDropdown(false)
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=8`)
      if (response.ok) {
        const data = await response.json()
        setResults(data.results || [])
        setShowDropdown((data.results?.length || 0) > 0)
      }
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, 300)

  // 获取价格
  const fetchPrice = useCallback(async (symbol: string) => {
    setIsPriceLoading(true)
    try {
      const response = await fetch(`/api/prices?symbols=${encodeURIComponent(symbol)}`)
      if (response.ok) {
        const data = await response.json()
        const priceData = data.prices?.[symbol]
        if (priceData) {
          const priceInfo: PriceInfo = {
            price: priceData.price,
            currency: priceData.currency,
            date: priceData.date,
            stale: priceData.stale,
          }
          setPrice(priceInfo)
          onPriceLoaded?.(priceInfo)
        } else {
          setPrice(null)
          onPriceLoaded?.(null)
        }
      }
    } catch (error) {
      console.error('Price fetch failed:', error)
      setPrice(null)
      onPriceLoaded?.(null)
    } finally {
      setIsPriceLoading(false)
    }
  }, [onPriceLoaded])

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setSelectedSymbol(null)
    setPrice(null)
    debouncedSearch(newValue)
  }

  // 处理选择
  const handleSelect = (result: SearchResult) => {
    onChange(result.symbol)
    setSelectedSymbol(result.symbol)
    setShowDropdown(false)
    setResults([])
    onSelect?.(result)
    fetchPrice(result.symbol)
  }

  // 当 value 从外部改变时，获取价格
  useEffect(() => {
    if (value && value === selectedSymbol) {
      // 已经选中的，不需要重新获取
      return
    }
    if (value && value.length >= 4) {
      // 可能是已保存的 symbol，尝试获取价格
      fetchPrice(value)
    }
  }, [value, selectedSymbol, fetchPrice])

  return (
    <div className="relative">
      <div className="relative">
        <Input
          value={value}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder={placeholder}
          className={className}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isSearching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {!isSearching && selectedSymbol && <Check className="h-4 w-4 text-green-500" />}
          {!isSearching && !selectedSymbol && <Search className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {/* 搜索结果下拉框 */}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.symbol}
              type="button"
              className="w-full px-3 py-2 text-left hover:bg-accent flex items-center justify-between"
              onClick={() => handleSelect(result)}
            >
              <div>
                <div className="font-medium text-sm text-foreground">{result.name}</div>
                <div className="text-xs text-muted-foreground">
                  {result.symbol}
                  {result.englishName && ` · ${result.englishName}`}
                </div>
              </div>
              <span className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground rounded">
                {result.assetType}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 价格显示 */}
      {(price || isPriceLoading) && (
        <div className="mt-2 p-2 bg-primary/10 rounded text-sm">
          {isPriceLoading ? (
            <span className="text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              获取价格中...
            </span>
          ) : price ? (
            <div className="flex items-center justify-between">
              <span className="text-primary">
                当前价格: <span className="font-semibold">{price.currency} {price.price.toFixed(2)}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {price.date}
                {price.stale && ' (可能过期)'}
              </span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
