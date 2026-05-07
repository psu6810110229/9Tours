import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import SearchSuggestions, { type SuggestionProvince, type SuggestionTour } from './SearchSuggestions'

export interface SearchBarProps {
  search: string
  setSearch: (value: string) => void
  guests: number
  setGuests: (value: number) => void
  childrenCount?: number
  setChildrenCount?: (value: number) => void
  onSearch: () => void
  showGuests?: boolean
  searchDisabled?: boolean
  className?: string
  tourType?: '' | 'one_day' | 'package'
  setTourType?: (value: '' | 'one_day' | 'package') => void
  transparent?: boolean
  // Optional search-preview / autocomplete props (Hero only)
  suggestionProvinces?: SuggestionProvince[]
  suggestionTours?: SuggestionTour[]
  showSuggestions?: boolean
  onSelectSuggestionProvince?: (province: string) => void
  onSelectSuggestionTour?: (tourId: number) => void
  onViewAllSuggestions?: () => void
  onSuggestionsClose?: () => void
}

const MIN_ADULTS = 1
const MIN_CHILDREN = 0
const MAX_TRAVELERS = 10

interface GuestPickerPosition {
  top: number
  left: number
  width: number
}

interface CounterRowProps {
  label: string
  hint: string
  value: number
  onDecrease: () => void
  onIncrease: () => void
  decreaseDisabled: boolean
  increaseDisabled: boolean
  accent?: 'blue' | 'amber'
}

function CounterRow({
  label,
  hint,
  value,
  onDecrease,
  onIncrease,
  decreaseDisabled,
  increaseDisabled,
  accent = 'blue',
}: CounterRowProps) {
  const activeClasses = accent === 'amber'
    ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white'
    : 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white'

  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.15rem] bg-slate-50 px-3 py-3.5">
      <div>
        <p className="text-sm font-bold text-slate-900">{label}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDecrease}
          disabled={decreaseDisabled}
          className={`ui-focus-ring ui-pressable flex h-10 w-10 items-center justify-center rounded-full border text-lg font-bold ${decreaseDisabled
            ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-300 hover:transform-none'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
          }`}
          aria-label={`ลดจำนวน${label}`}
        >
          -
        </button>

        <div className="min-w-[44px] text-center">
          <p className="text-xl font-black text-slate-900">{value}</p>
        </div>

        <button
          type="button"
          onClick={onIncrease}
          disabled={increaseDisabled}
          className={`ui-focus-ring ui-pressable flex h-10 w-10 items-center justify-center rounded-full border text-lg font-bold ${increaseDisabled
            ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-300 hover:transform-none'
            : activeClasses
          }`}
          aria-label={`เพิ่มจำนวน${label}`}
        >
          +
        </button>
      </div>
    </div>
  )
}

export default function SearchBar({
  search,
  setSearch,
  guests,
  setGuests,
  childrenCount,
  setChildrenCount,
  onSearch,
  showGuests = true,
  searchDisabled = false,
  className = '',
  tourType,
  setTourType,
  transparent = false,
  suggestionProvinces,
  suggestionTours,
  showSuggestions = false,
  onSelectSuggestionProvince,
  onSelectSuggestionTour,
  onViewAllSuggestions,
  onSuggestionsClose,
}: SearchBarProps) {
  const [isGuestPickerOpen, setIsGuestPickerOpen] = useState(false)
  const [guestPickerPosition, setGuestPickerPosition] = useState<GuestPickerPosition | null>(null)
  const guestPickerRef = useRef<HTMLDivElement>(null)
  const guestTriggerRef = useRef<HTMLButtonElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const [suggestionPos, setSuggestionPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const hasChildrenPicker = typeof childrenCount === 'number' && typeof setChildrenCount === 'function'
  const hasTourTypePicker = typeof tourType === 'string' && typeof setTourType === 'function'
  const resolvedChildrenCount = hasChildrenPicker ? childrenCount : 0
  const totalTravelers = guests + resolvedChildrenCount
  const canIncreaseAdults = totalTravelers < MAX_TRAVELERS
  const canIncreaseChildren = totalTravelers < MAX_TRAVELERS
  const surfaceClasses = transparent
    ? 'border-white/55 bg-white/88 shadow-[0_24px_50px_rgba(15,23,42,0.22)] sm:border-white/15 sm:bg-white/10 sm:shadow-[0_22px_48px_rgba(15,23,42,0.2)]'
    : 'border-white/70 bg-white/95 shadow-[0_22px_48px_rgba(15,23,42,0.16)]'
  const blurClasses = transparent ? 'backdrop-blur-md sm:backdrop-blur-sm' : 'backdrop-blur-xl'
  const segmentClasses = transparent
    ? 'border-slate-200 bg-slate-50 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)] sm:border-slate-200/80 sm:bg-white/90 sm:shadow-[inset_0_0_0_0.25px_rgba(226,232,240,0.8)]'
    : 'border-slate-200 bg-slate-50'
  const fieldClasses = 'border border-slate-200/90 bg-white shadow-[inset_0_0_0_1px_rgba(226,232,240,0.65)]'
  const inputToneClasses = 'text-gray-800 placeholder:text-gray-400'
  const inactiveSegmentTextClasses = transparent
    ? 'text-slate-500 hover:text-slate-900 sm:text-slate-400'
    : 'text-slate-500 hover:text-slate-800'
  const shellPaddingClasses = transparent ? 'px-1.5 pt-1.5 pb-1 sm:p-2.5' : 'p-2.5 sm:p-3'
  const layoutGapClasses = transparent ? 'gap-2.25 lg:gap-2.5' : 'gap-2.5'
  const segmentWrapperClasses = transparent ? 'rounded-[1rem] p-[3px] min-h-[46px] sm:rounded-[1.2rem] sm:p-1 sm:min-h-[58px]' : 'rounded-[1.35rem] p-1.5'
  const segmentButtonClasses = transparent ? ' min-h-[38px] px-1.5 py-0 text-[13px] sm:min-h-[50px] sm:px-3.5 sm:text-[14px]' : 'px-4 py-3 text-[15px]'
  const fieldPaddingClasses = transparent ? 'rounded-[1rem] px-3 py-1.5 sm:rounded-[1.2rem] sm:px-4 sm:py-2.5' : 'rounded-[1.35rem] px-5 py-3'
  const searchIconWrapperClasses = transparent ? 'h-8 w-8 sm:h-9 sm:w-9' : 'h-10 w-10'
  const searchInputClasses = transparent ? 'text-[13px] sm:text-[14px]' : 'text-[15px] sm:text-[15px]'
  const searchButtonClasses = transparent ? 'min-h-[38px] w-full rounded-[1rem] px-4 py-0 text-[14px] sm:w-auto sm:min-w-[90px] sm:rounded-[1.2rem] sm:py-1' : 'rounded-[1.35rem] px-5 py-3 text-[15px] sm:min-w-[140px]'

  // Position the suggestions dropdown below the search bar container
  useEffect(() => {
    if (!showSuggestions) {
      setSuggestionPos(null)
      return
    }
    const update = () => {
      const el = searchContainerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vw = window.innerWidth
      const width = Math.min(rect.width, vw - 24)
      const left = Math.min(Math.max(12, rect.left), Math.max(12, vw - width - 12))
      setSuggestionPos({ top: rect.bottom + 8, left, width })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [showSuggestions])

  useEffect(() => {
    if (!isGuestPickerOpen) return

    const updateGuestPickerPosition = () => {
      const trigger = guestTriggerRef.current
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const preferredWidth = Math.max(rect.width, 320)
      const maxWidth = Math.min(preferredWidth, viewportWidth - 24)
      const left = Math.min(
        Math.max(12, rect.left),
        Math.max(12, viewportWidth - maxWidth - 12),
      )

      setGuestPickerPosition({
        top: rect.bottom + 10,
        left,
        width: maxWidth,
      })
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        !guestPickerRef.current?.contains(target)
        && !guestTriggerRef.current?.contains(target)
      ) {
        setIsGuestPickerOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsGuestPickerOpen(false)
      }
    }

    updateGuestPickerPosition()
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', updateGuestPickerPosition)
    window.addEventListener('scroll', updateGuestPickerPosition, true)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', updateGuestPickerPosition)
      window.removeEventListener('scroll', updateGuestPickerPosition, true)
    }
  }, [isGuestPickerOpen])

  const decreaseAdults = () => setGuests(Math.max(MIN_ADULTS, guests - 1))
  const increaseAdults = () => setGuests(Math.min(MAX_TRAVELERS, guests + 1))
  const decreaseChildren = () => {
    if (!setChildrenCount) return
    setChildrenCount(Math.max(MIN_CHILDREN, resolvedChildrenCount - 1))
  }
  const increaseChildren = () => {
    if (!setChildrenCount) return
    setChildrenCount(Math.min(MAX_TRAVELERS, resolvedChildrenCount + 1))
  }

  const guestSummary = hasChildrenPicker && resolvedChildrenCount > 0
    ? `ผู้ใหญ่ ${guests}, เด็ก ${resolvedChildrenCount}`
    : `${guests} ท่าน`

  const guestPicker = isGuestPickerOpen && guestPickerPosition
    ? createPortal(
      <div
        ref={guestPickerRef}
        className="ui-pop fixed z-[var(--z-dropdown)] rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-[0_22px_60px_rgba(15,23,42,0.18)]"
        style={{
          top: `${guestPickerPosition.top}px`,
          left: `${guestPickerPosition.left}px`,
          width: `${guestPickerPosition.width}px`,
        }}
      >
        <div className="flex items-center justify-between gap-4 rounded-[1.1rem] bg-slate-50 px-3 py-3">
          <div>
            <p className="text-sm font-bold text-slate-900">จำนวนผู้เดินทาง</p>
            <p className="mt-1 text-xs font-medium text-slate-500">รวมทั้งหมดได้ไม่เกิน {MAX_TRAVELERS} ท่าน</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-[var(--color-primary)] shadow-sm">
            {totalTravelers} ท่าน
          </span>
        </div>

        <div className="mt-4 space-y-3">
          <CounterRow
            label="ผู้ใหญ่"
            hint="อย่างน้อย 1 ท่าน"
            value={guests}
            onDecrease={decreaseAdults}
            onIncrease={increaseAdults}
            decreaseDisabled={guests <= MIN_ADULTS}
            increaseDisabled={!canIncreaseAdults}
            accent="blue"
          />

          {hasChildrenPicker && (
            <CounterRow
              label="เด็ก"
              hint="อายุต่ำกว่าเกณฑ์ผู้ใหญ่"
              value={resolvedChildrenCount}
              onDecrease={decreaseChildren}
              onIncrease={increaseChildren}
              decreaseDisabled={resolvedChildrenCount <= MIN_CHILDREN}
              increaseDisabled={!canIncreaseChildren}
              accent="amber"
            />
          )}
        </div>
      </div>,
      document.body,
    )
    : null

  const hasSuggestions = (suggestionProvinces?.length ?? 0) > 0 || (suggestionTours?.length ?? 0) > 0

  const suggestionPortal = showSuggestions && suggestionPos && hasSuggestions
    ? createPortal(
      <SearchSuggestions
        query={search}
        provinces={suggestionProvinces ?? []}
        tours={suggestionTours ?? []}
        onSelectProvince={onSelectSuggestionProvince ?? (() => undefined)}
        onSelectTour={onSelectSuggestionTour ?? (() => undefined)}
        onViewAll={onViewAllSuggestions ?? onSearch}
        style={{ top: `${suggestionPos.top}px`, left: `${suggestionPos.left}px`, width: `${suggestionPos.width}px` }}
      />,
      document.body,
    )
    : null

  return (
    <>
      <div ref={searchContainerRef} className={`ui-surface mx-auto w-full max-w-4xl rounded-[1.5rem] border sm:rounded-[3rem] ${shellPaddingClasses} ${blurClasses} ${surfaceClasses} ${className}`.trim()}>
        <div className={`flex flex-col ${layoutGapClasses} lg:flex-row lg:items-stretch`.trim()}>
          {hasTourTypePicker && (
            <div className="lg:flex-shrink-0">
              {(() => {
                const options: { value: '' | 'one_day' | 'package'; label: string }[] = [
                  { value: '', label: 'ทั้งหมด' },
                  { value: 'one_day', label: 'วันเดย์ทริป' },
                  { value: 'package', label: 'แพ็กเกจ' },
                ]
                const activeIdx = options.findIndex((o) => o.value === tourType)
                const count = options.length

                return (
                  <div className={`relative inline-flex w-full border sm:w-auto ${segmentWrapperClasses} ${segmentClasses}`.trim()}>
                    {/* Sliding indicator */}
                    <div
                      className="absolute top-1 bottom-1 rounded-[1rem] transition-all duration-300 ease-[cubic-bezier(.4,0,.2,1)]"
                      style={{
                        width: `calc(${100 / count}% - 4px)`,
                        left: `calc(${(activeIdx < 0 ? 0 : activeIdx) * (100 / count)}% + 2px)`,
                        background: 'var(--color-primary)',
                        boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
                      }}
                    />
                    {options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setTourType!(option.value)}
                        className={`relative z-10 flex-1 rounded-[0.95rem] font-semibold transition-colors duration-300 ${segmentButtonClasses} ${tourType === option.value ? 'text-white' : inactiveSegmentTextClasses}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}

          <label className={`flex min-w-0 flex-1 items-center gap-3 ${fieldPaddingClasses} ${fieldClasses}`.trim()}>
            <span className={`flex ${searchIconWrapperClasses} flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] shadow-[inset_0_0_0_1px_rgba(37,99,235,0.08)]`}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.1}>
                <circle cx="11" cy="11" r="7.5" />
                <path d="m20 20-3.8-3.8" strokeLinecap="round" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <input
                type="text"
                placeholder="ค้นหาทัวร์หรือสถานที่..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onBlur={() => onSuggestionsClose?.()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !searchDisabled) {
                    onSearch()
                    onSuggestionsClose?.()
                  }
                  if (event.key === 'Escape') {
                    onSuggestionsClose?.()
                  }
                }}
                className={`w-full min-w-0 bg-transparent font-semibold outline-none placeholder:font-medium ${searchInputClasses} ${inputToneClasses}`.trim()}
              />
            </div>
          </label>

          <div className="flex flex-col gap-2 sm:flex-row lg:flex-shrink-0">
            {showGuests && (
              <div className="relative sm:min-w-[228px]">
                <button
                  ref={guestTriggerRef}
                  type="button"
                  onClick={() => setIsGuestPickerOpen((prev) => !prev)}
                  className="ui-focus-ring flex h-full w-full items-center gap-3 rounded-[1.35rem] border border-gray-100 bg-gray-50 px-5 py-3 text-left lg:bg-white"
                  aria-haspopup="dialog"
                  aria-expanded={isGuestPickerOpen}
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.08)]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">ผู้เดินทาง</p>
                    <p className="mt-1 text-base font-semibold text-gray-800">{totalTravelers} ท่าน</p>
                    {hasChildrenPicker && (
                      <p className="mt-0.5 truncate text-xs font-medium text-gray-400">{guestSummary}</p>
                    )}
                  </div>
                  <svg
                    className={`h-5 w-5 flex-shrink-0 text-gray-500 transition-transform ${isGuestPickerOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.4}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onSearch}
              disabled={searchDisabled}
              className={`ui-focus-ring ui-pressable font-bold text-white ${searchButtonClasses} ${searchDisabled
                ? 'cursor-not-allowed bg-slate-300 shadow-none hover:bg-slate-300'
                : `${transparent ? 'bg-[var(--color-primary)] shadow-none hover:bg-[var(--color-primary-dark)]' : 'bg-[var(--color-primary)] shadow-[0_14px_28px_rgba(37,99,235,0.2)] hover:bg-[var(--color-primary-dark)]'}`
              }`}
            >
              ค้นหา
            </button>
          </div>
        </div>
      </div>
      {guestPicker}
      {suggestionPortal}
    </>
  )
}
