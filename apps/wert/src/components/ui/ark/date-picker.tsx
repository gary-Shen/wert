'use client'

import { DatePicker as ArkDatePicker, type DateValue } from '@ark-ui/react/date-picker'
import { Portal } from '@ark-ui/react/portal'
import { forwardRef, useMemo } from 'react'
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface DatePickerProps {
  value?: Date | string
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

const DatePicker = forwardRef<HTMLDivElement, DatePickerProps>(
  ({ value, onChange, placeholder = "选择日期", className, disabled }, ref) => {
    // Parse value to Ark format
    const parsedValue = useMemo(() => {
      if (!value) return undefined
      const date = value instanceof Date ? value : new Date(value + 'T00:00:00')
      if (isNaN(date.getTime())) return undefined
      return [{
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate()
      }] as DateValue[]
    }, [value])

    const handleChange = (details: { value: DateValue[] }) => {
      if (details.value.length > 0) {
        const v = details.value[0]
        const date = new Date(v.year, v.month - 1, v.day)
        onChange?.(date)
      } else {
        onChange?.(undefined)
      }
    }

    return (
      <ArkDatePicker.Root
        ref={ref}
        value={parsedValue}
        onValueChange={handleChange}
        disabled={disabled}
        locale="zh-CN"
        closeOnSelect
      >
        <ArkDatePicker.Control className={cn("relative", className)}>
          <ArkDatePicker.Trigger asChild>
            <Button
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full justify-start text-left font-normal",
                !value && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? (
                value instanceof Date
                  ? value.toLocaleDateString('zh-CN')
                  : new Date(value + 'T00:00:00').toLocaleDateString('zh-CN')
              ) : placeholder}
            </Button>
          </ArkDatePicker.Trigger>
        </ArkDatePicker.Control>

        <Portal>
          <ArkDatePicker.Positioner>
            <ArkDatePicker.Content
              className={cn(
                "z-50 rounded-lg border bg-popover p-3 text-popover-foreground shadow-md",
                "animate-in fade-in-0 zoom-in-95",
                "touch-manipulation"
              )}
            >
              <ArkDatePicker.View view="day">
                <ArkDatePicker.Context>
                  {(api) => (
                    <>
                      <ArkDatePicker.ViewControl className="flex items-center justify-between mb-4">
                        <ArkDatePicker.PrevTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        </ArkDatePicker.PrevTrigger>
                        <ArkDatePicker.ViewTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ArkDatePicker.RangeText />
                          </Button>
                        </ArkDatePicker.ViewTrigger>
                        <ArkDatePicker.NextTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </ArkDatePicker.NextTrigger>
                      </ArkDatePicker.ViewControl>
                      <ArkDatePicker.Table>
                        <ArkDatePicker.TableHead>
                          <ArkDatePicker.TableRow>
                            {api.weekDays.map((weekDay, i) => (
                              <ArkDatePicker.TableHeader key={i} className="w-9 h-9 text-center text-xs text-muted-foreground font-normal">
                                {weekDay.narrow}
                              </ArkDatePicker.TableHeader>
                            ))}
                          </ArkDatePicker.TableRow>
                        </ArkDatePicker.TableHead>
                        <ArkDatePicker.TableBody>
                          {api.weeks.map((week, i) => (
                            <ArkDatePicker.TableRow key={i}>
                              {week.map((day, j) => (
                                <ArkDatePicker.TableCell key={j} value={day}>
                                  <ArkDatePicker.TableCellTrigger
                                    className={cn(
                                      "inline-flex items-center justify-center rounded-md h-9 w-9 text-sm font-normal",
                                      "transition-colors hover:bg-accent hover:text-accent-foreground",
                                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                      "touch-manipulation select-none",
                                      // Outside month
                                      "data-[outside-range]:text-muted-foreground/50",
                                      // Selected
                                      "data-[selected]:bg-primary data-[selected]:text-primary-foreground",
                                      // Today
                                      "data-[today]:bg-accent data-[today]:text-accent-foreground",
                                      // Disabled
                                      "data-[disabled]:opacity-50 data-[disabled]:pointer-events-none"
                                    )}
                                  >
                                    {day.day}
                                  </ArkDatePicker.TableCellTrigger>
                                </ArkDatePicker.TableCell>
                              ))}
                            </ArkDatePicker.TableRow>
                          ))}
                        </ArkDatePicker.TableBody>
                      </ArkDatePicker.Table>
                    </>
                  )}
                </ArkDatePicker.Context>
              </ArkDatePicker.View>

              {/* Month view */}
              <ArkDatePicker.View view="month">
                <ArkDatePicker.Context>
                  {(api) => (
                    <>
                      <ArkDatePicker.ViewControl className="flex items-center justify-between mb-4">
                        <ArkDatePicker.PrevTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        </ArkDatePicker.PrevTrigger>
                        <ArkDatePicker.ViewTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ArkDatePicker.RangeText />
                          </Button>
                        </ArkDatePicker.ViewTrigger>
                        <ArkDatePicker.NextTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </ArkDatePicker.NextTrigger>
                      </ArkDatePicker.ViewControl>
                      <ArkDatePicker.Table>
                        <ArkDatePicker.TableBody>
                          {api.getMonthsGrid({ columns: 4, format: 'short' }).map((months, i) => (
                            <ArkDatePicker.TableRow key={i}>
                              {months.map((month, j) => (
                                <ArkDatePicker.TableCell key={j} value={month.value}>
                                  <ArkDatePicker.TableCellTrigger
                                    className={cn(
                                      "inline-flex items-center justify-center rounded-md h-9 px-3 text-sm font-normal",
                                      "transition-colors hover:bg-accent hover:text-accent-foreground",
                                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                      "touch-manipulation select-none"
                                    )}
                                  >
                                    {month.label}
                                  </ArkDatePicker.TableCellTrigger>
                                </ArkDatePicker.TableCell>
                              ))}
                            </ArkDatePicker.TableRow>
                          ))}
                        </ArkDatePicker.TableBody>
                      </ArkDatePicker.Table>
                    </>
                  )}
                </ArkDatePicker.Context>
              </ArkDatePicker.View>

              {/* Year view */}
              <ArkDatePicker.View view="year">
                <ArkDatePicker.Context>
                  {(api) => (
                    <>
                      <ArkDatePicker.ViewControl className="flex items-center justify-between mb-4">
                        <ArkDatePicker.PrevTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        </ArkDatePicker.PrevTrigger>
                        <ArkDatePicker.ViewTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ArkDatePicker.RangeText />
                          </Button>
                        </ArkDatePicker.ViewTrigger>
                        <ArkDatePicker.NextTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </ArkDatePicker.NextTrigger>
                      </ArkDatePicker.ViewControl>
                      <ArkDatePicker.Table>
                        <ArkDatePicker.TableBody>
                          {api.getYearsGrid({ columns: 4 }).map((years, i) => (
                            <ArkDatePicker.TableRow key={i}>
                              {years.map((year, j) => (
                                <ArkDatePicker.TableCell key={j} value={year.value}>
                                  <ArkDatePicker.TableCellTrigger
                                    className={cn(
                                      "inline-flex items-center justify-center rounded-md h-9 px-3 text-sm font-normal",
                                      "transition-colors hover:bg-accent hover:text-accent-foreground",
                                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                      "touch-manipulation select-none"
                                    )}
                                  >
                                    {year.label}
                                  </ArkDatePicker.TableCellTrigger>
                                </ArkDatePicker.TableCell>
                              ))}
                            </ArkDatePicker.TableRow>
                          ))}
                        </ArkDatePicker.TableBody>
                      </ArkDatePicker.Table>
                    </>
                  )}
                </ArkDatePicker.Context>
              </ArkDatePicker.View>
            </ArkDatePicker.Content>
          </ArkDatePicker.Positioner>
        </Portal>
      </ArkDatePicker.Root>
    )
  }
)
DatePicker.displayName = 'DatePicker'

export { DatePicker }
