/**
 * Region detection utilities
 * Detects user region based on Accept-Language header and timezone
 */

export type Region = 'CN' | 'OVERSEAS'

export interface GeoDetectionResult {
  region: Region
  suggestedCurrency: string
  locale: string
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Detect region from Accept-Language header
 */
export function detectRegionFromLanguage(acceptLanguage: string | null): Region | null {
  if (!acceptLanguage) return null

  const lang = acceptLanguage.toLowerCase()

  // Chinese language variants indicate China region
  if (
    lang.startsWith('zh-cn') ||
    lang.startsWith('zh-hans') ||
    lang.includes('zh-cn') ||
    lang.includes('zh-hans')
  ) {
    return 'CN'
  }

  // Traditional Chinese (Taiwan, HK) or other languages indicate overseas
  if (
    lang.startsWith('zh-tw') ||
    lang.startsWith('zh-hk') ||
    lang.startsWith('zh-hant') ||
    lang.startsWith('en') ||
    lang.startsWith('ja') ||
    lang.startsWith('ko')
  ) {
    return 'OVERSEAS'
  }

  return null
}

/**
 * Detect region from timezone
 */
export function detectRegionFromTimezone(timezone: string | null): Region | null {
  if (!timezone) return null

  const tz = timezone.toLowerCase()

  // China timezones
  if (tz === 'asia/shanghai' || tz === 'asia/chongqing' || tz === 'asia/harbin' || tz === 'asia/urumqi') {
    return 'CN'
  }

  // Other Asian financial centers
  if (tz === 'asia/hong_kong' || tz === 'asia/singapore' || tz === 'asia/tokyo') {
    return 'OVERSEAS'
  }

  // US timezones
  if (tz.startsWith('america/') || tz.startsWith('us/')) {
    return 'OVERSEAS'
  }

  // Europe timezones
  if (tz.startsWith('europe/')) {
    return 'OVERSEAS'
  }

  return null
}

/**
 * Get default currency for a region
 */
export function getDefaultCurrency(region: Region): string {
  return region === 'CN' ? 'CNY' : 'USD'
}

/**
 * Get default locale for a region
 */
export function getDefaultLocale(region: Region): string {
  return region === 'CN' ? 'zh-CN' : 'en-US'
}

/**
 * Combined region detection
 * Uses Accept-Language as primary, timezone as fallback
 */
export function detectRegion(
  acceptLanguage: string | null,
  timezone: string | null
): GeoDetectionResult {
  // Try language detection first (higher confidence)
  const langRegion = detectRegionFromLanguage(acceptLanguage)
  if (langRegion) {
    return {
      region: langRegion,
      suggestedCurrency: getDefaultCurrency(langRegion),
      locale: getDefaultLocale(langRegion),
      confidence: 'high',
    }
  }

  // Try timezone detection (medium confidence)
  const tzRegion = detectRegionFromTimezone(timezone)
  if (tzRegion) {
    return {
      region: tzRegion,
      suggestedCurrency: getDefaultCurrency(tzRegion),
      locale: getDefaultLocale(tzRegion),
      confidence: 'medium',
    }
  }

  // Default to China (low confidence)
  return {
    region: 'CN',
    suggestedCurrency: 'CNY',
    locale: 'zh-CN',
    confidence: 'low',
  }
}

/**
 * Available currencies for selection
 */
export const AVAILABLE_CURRENCIES = [
  { code: 'CNY', name: '人民币', symbol: '¥', region: 'CN' },
  { code: 'USD', name: '美元', symbol: '$', region: 'OVERSEAS' },
  { code: 'HKD', name: '港币', symbol: 'HK$', region: 'OVERSEAS' },
  { code: 'EUR', name: '欧元', symbol: '€', region: 'OVERSEAS' },
  { code: 'GBP', name: '英镑', symbol: '£', region: 'OVERSEAS' },
  { code: 'JPY', name: '日元', symbol: '¥', region: 'OVERSEAS' },
  { code: 'SGD', name: '新加坡元', symbol: 'S$', region: 'OVERSEAS' },
] as const

export type CurrencyCode = (typeof AVAILABLE_CURRENCIES)[number]['code']
