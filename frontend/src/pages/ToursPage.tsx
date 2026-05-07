import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import TourCard from '../components/TourCard'
import SearchBar from '../components/common/SearchBar'
import FilterSidebar from '../components/tour/FilterSidebar'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import { festivalService } from '../services/festivalService'
import { tourService } from '../services/tourService'
import type { Festival, Tour } from '../types/tour'
import { useFavoritesContext } from '../context/FavoritesContext'

const PAGE_SIZE = 12

const SORT_OPTIONS = [
  { value: 'default', label: 'เรียงตาม: ค่าเริ่มต้น' },
  { value: 'price_asc', label: 'ราคา: ต่ำ → สูง' },
  { value: 'price_desc', label: 'ราคา: สูง → ต่ำ' },
  { value: 'rating', label: 'คะแนนสูงสุด' },
]

function parseDelimitedParam(value: string | null) {
  if (!value) return []
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function parseNumberParam(value: string | null) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function formatMonthLabel(monthValue: string) {
  const date = new Date(`${monthValue}-01T00:00:00`)
  if (Number.isNaN(date.getTime())) return monthValue
  return date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
}

export default function ToursPage() {
  const { isFavorite, toggleFavorite } = useFavoritesContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [allTours, setAllTours] = useState<Tour[]>([])
  const [tours, setTours] = useState<Tour[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('default')
  const [currentPage, setCurrentPage] = useState(1)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement>(null)
  const mobileFiltersDrawerRef = useRef<HTMLDivElement>(null)

  const [region, setRegion] = useState(searchParams.get('region') || '')
  const [province, setProvince] = useState(searchParams.get('province') || '')
  const [tourType, setTourType] = useState(searchParams.get('tourType') || '')
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [year, setYear] = useState(searchParams.get('year') || '')
  const [month, setMonth] = useState(searchParams.get('month') || '')
  const [categories, setCategories] = useState<string[]>(() => parseDelimitedParam(searchParams.get('categories')))
  const [minPrice, setMinPrice] = useState<number | undefined>(() => parseNumberParam(searchParams.get('minPrice')))
  const [maxPrice, setMaxPrice] = useState<number | undefined>(() => parseNumberParam(searchParams.get('maxPrice')))
  const [festivals, setFestivals] = useState<Festival[]>([])
  const [festivalId, setFestivalId] = useState<number | null>(() => {
    const raw = searchParams.get('festivalId')
    return raw ? Number(raw) : null
  })

  useBodyScrollLock(mobileFiltersOpen, { allowTouchMoveRefs: [mobileFiltersDrawerRef] })

  useEffect(() => {
    tourService.getAll()
      .then(setAllTours)
      .catch(() => setAllTours([]))
    festivalService.getAll().then(setFestivals).catch(() => { })
  }, [])

  useEffect(() => {
    setRegion(searchParams.get('region') || '')
    setProvince(searchParams.get('province') || '')
    setTourType(searchParams.get('tourType') || '')
    setSearch(searchParams.get('search') || '')
    setYear(searchParams.get('year') || '')
    setMonth(searchParams.get('month') || '')
    setCategories(parseDelimitedParam(searchParams.get('categories')))
    setMinPrice(parseNumberParam(searchParams.get('minPrice')))
    setMaxPrice(parseNumberParam(searchParams.get('maxPrice')))
    setFestivalId(searchParams.get('festivalId') ? Number(searchParams.get('festivalId')) : null)
  }, [searchParams])

  const priceBounds = useMemo(() => {
    if (allTours.length === 0) {
      return { min: 0, max: 10000 }
    }

    const prices = allTours
      .map((tour) => Number(tour.price))
      .filter((price) => Number.isFinite(price))

    const min = Math.min(...prices)
    const max = Math.max(...prices)
    return { min, max: Math.max(min, max) }
  }, [allTours])

  useEffect(() => {
    setMinPrice((prev) => {
      if (typeof prev !== 'number') return priceBounds.min
      return Math.min(Math.max(prev, priceBounds.min), maxPrice ?? priceBounds.max)
    })

    setMaxPrice((prev) => {
      if (typeof prev !== 'number') return priceBounds.max
      return Math.max(Math.min(prev, priceBounds.max), minPrice ?? priceBounds.min)
    })
  }, [maxPrice, minPrice, priceBounds.max, priceBounds.min])

  useEffect(() => {
    if (typeof minPrice !== 'number' || typeof maxPrice !== 'number') return

    setLoading(true)
    tourService
      .getAll({
        region: region || undefined,
        province: province || undefined,
        tourType: tourType || undefined,
        search: search || undefined,
        categories: categories.length > 0 ? categories : undefined,
        minPrice,
        maxPrice,
        festivalId: festivalId || undefined,
      })
      .then((items) => {
        const filteredByDate = items.filter((tour) => {
          if (!year && !month) return true

          return tour.schedules.some((schedule) => {
            const startDate = schedule.startDate
            if (!startDate) return false

            const scheduleYear = startDate.slice(0, 4)
            const scheduleMonth = startDate.slice(5, 7)
            const selectedMonth = month.includes('-') ? month.slice(5, 7) : month

            const yearMatches = !year || scheduleYear === year
            const monthMatches = !selectedMonth || scheduleMonth === selectedMonth

            return yearMatches && monthMatches
          })
        })

        setTours(filteredByDate)
      })
      .catch((error) => {
        console.error(error)
        setTours([])
      })
      .finally(() => setLoading(false))
  }, [categories, festivalId, maxPrice, minPrice, month, province, region, search, tourType, year])

  useEffect(() => {
    if (typeof minPrice !== 'number' || typeof maxPrice !== 'number') return

    const params = new URLSearchParams()
    if (region) params.set('region', region)
    if (province) params.set('province', province)
    if (tourType) params.set('tourType', tourType)
    if (search) params.set('search', search)
    if (year) params.set('year', year)
    if (month) params.set('month', month)
    if (categories.length > 0) params.set('categories', categories.join(','))
    if (minPrice > priceBounds.min) params.set('minPrice', String(minPrice))
    if (maxPrice < priceBounds.max) params.set('maxPrice', String(maxPrice))
    if (festivalId) params.set('festivalId', String(festivalId))
    setSearchParams(params, { replace: true })
  }, [categories, festivalId, maxPrice, minPrice, month, priceBounds.max, priceBounds.min, province, region, search, setSearchParams, tourType, year])

  useEffect(() => {
    if (!sortMenuOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!sortMenuRef.current?.contains(event.target as Node)) {
        setSortMenuOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSortMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [sortMenuOpen])

  const sortedTours = useMemo(() => {
    return [...tours].sort((a, b) => {
      if (sortBy === 'price_asc') return Number(a.price) - Number(b.price)
      if (sortBy === 'price_desc') return Number(b.price) - Number(a.price)
      if (sortBy === 'rating') return b.rating - a.rating
      return 0
    })
  }, [sortBy, tours])

  // Reset to page 1 whenever filters or sort change
  useEffect(() => { setCurrentPage(1) }, [sortedTours])

  const totalPages = Math.ceil(sortedTours.length / PAGE_SIZE)
  const pagedTours = useMemo(
    () => sortedTours.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sortedTours, currentPage],
  )

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const availableCategories = useMemo(() => {
    return Array.from(new Set(allTours.flatMap((tour) => tour.categories))).sort((a, b) => a.localeCompare(b, 'th'))
  }, [allTours])

  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    allTours.forEach((tour) => {
      tour.schedules.forEach((schedule) => {
        if (schedule.startDate) {
          months.add(schedule.startDate.slice(0, 7))
        }
      })
    })

    return Array.from(months)
      .sort()
      .map((value) => ({ value, label: formatMonthLabel(value) }))
  }, [allTours])

  const activeFilterCount = [
    region,
    province,
    tourType,
    search.trim(),
    year ? 'year' : '',
    month ? 'month' : '',
    categories.length > 0 ? 'categories' : '',
    festivalId ? 'festival' : '',
    typeof minPrice === 'number' && minPrice > priceBounds.min ? 'minPrice' : '',
    typeof maxPrice === 'number' && maxPrice < priceBounds.max ? 'maxPrice' : '',
  ].filter(Boolean).length

  const selectedSortLabel = SORT_OPTIONS.find((option) => option.value === sortBy)?.label ?? SORT_OPTIONS[0].label

  const toggleCategory = (category: string) => {
    setCategories((prev) => (
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    ))
  }

  const handleYearChange = (value: string) => {
    setYear(value)
    if (!value) {
      setMonth((prev) => (prev.includes('-') ? prev.slice(5, 7) : prev))
      return
    }

    setMonth((prev) => {
      if (!prev) return ''
      const monthNumber = prev.includes('-') ? prev.slice(5, 7) : prev
      return `${value}-${monthNumber}`
    })
  }

  const clearFilters = () => {
    setRegion('')
    setProvince('')
    setTourType('')
    setSearch('')
    setYear('')
    setMonth('')
    setCategories([])
    setMinPrice(priceBounds.min)
    setMaxPrice(priceBounds.max)
    setFestivalId(null)
  }

  const handleMinPriceChange = (value: number) => {
    setMinPrice(Math.min(value, maxPrice ?? priceBounds.max))
  }

  const handleMaxPriceChange = (value: number) => {
    setMaxPrice(Math.max(value, minPrice ?? priceBounds.min))
  }

  return (
    <>
      <div className="mx-auto flex max-w-7xl gap-6 px-3 py-3 sm:px-6 sm:py-6 lg:px-8">
        <div className="hidden lg:block">
          <FilterSidebar
            region={region}
            province={province}
            tourType={tourType}
            search={search}
            categories={categories}
            year={year}
            month={month}
            minPrice={minPrice ?? priceBounds.min}
            maxPrice={maxPrice ?? priceBounds.max}
            priceBounds={priceBounds}
            availableCategories={availableCategories}
            availableMonths={availableMonths}
            onRegionChange={setRegion}
            onProvinceChange={setProvince}
            onTourTypeChange={setTourType}
            onCategoryToggle={toggleCategory}
            onYearChange={handleYearChange}
            onMonthChange={setMonth}
            onMinPriceChange={handleMinPriceChange}
            onMaxPriceChange={handleMaxPriceChange}
            festivals={festivals}
            festivalId={festivalId}
            onFestivalChange={setFestivalId}
            onClear={clearFilters}
          />
        </div>
        <main className="min-w-0 flex-1">
          <div className="mb-4 rounded-[2rem] px-3 py-2 sm:px-6">
            <SearchBar
              search={search}
              setSearch={setSearch}
              guests={1}
              setGuests={() => undefined}
              onSearch={() => undefined}
              showGuests={false}
            />
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="ui-focus-ring ui-pressable hidden items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 sm:inline-flex lg:hidden"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707L14 14v5l-4 2v-7L3.293 6.293A1 1 0 013 5.586V4z" />
                </svg>
                ตัวกรอง {activeFilterCount > 0 && <span className="rounded-full bg-[var(--color-primary-light)] px-2 py-0.5 text-xs text-[var(--color-primary)]">{activeFilterCount}</span>}
              </button>
            </div>
          </div>

          <div className="mb-3 sm:mb-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="hidden space-y-0.5 sm:block">
              </div>
              <div className="flex w-full justify-end sm:w-auto">
                <div className="flex w-full items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setMobileFiltersOpen(true)}
                    className="ui-focus-ring ui-pressable inline-flex flex-[1.3] items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-semibold text-gray-700 shadow-sm active:scale-[0.98] hover:border-gray-300 hover:bg-gray-50 sm:hidden"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707L14 14v5l-4 2v-7L3.293 6.293A1 1 0 013 5.586V4z" />
                    </svg>
                    <span className="truncate leading-none">ตัวกรอง</span>
                    {activeFilterCount > 0 && <span className="rounded-full bg-[var(--color-primary-light)] px-1.5 py-0.5 text-[10px] leading-none text-[var(--color-primary)]">{activeFilterCount}</span>}
                  </button>

                  <div ref={sortMenuRef} className="relative flex-[1.45] min-w-0 sm:flex-none sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setSortMenuOpen((prev) => !prev)}
                      className="ui-focus-ring inline-flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-semibold text-gray-700 shadow-sm transition-colors active:scale-[0.98] hover:border-gray-300 hover:bg-gray-50 sm:w-auto sm:justify-start sm:rounded-2xl sm:border sm:border-gray-200 sm:bg-gray-50 sm:px-4 sm:py-3 sm:text-sm"
                      aria-haspopup="listbox"
                      aria-expanded={sortMenuOpen}
                    >
                      <span className="truncate">{selectedSortLabel}</span>
                      <svg className={`h-3.5 w-3.5 shrink-0 text-gray-500 transition-transform ${sortMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                      </svg>
                    </button>

                    {sortMenuOpen && (
                      <div className="ui-pop animate-slide-up absolute right-0 top-[calc(100%+0.5rem)] z-30 w-full min-w-[190px] rounded-xl border border-gray-200 bg-white p-1.5 shadow-[0_20px_40px_rgba(15,23,42,0.16)] sm:w-auto sm:rounded-[1.25rem]">
                        <div role="listbox" aria-label="เรียงลำดับทัวร์" className="space-y-0.5">
                          {SORT_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setSortBy(option.value)
                                setSortMenuOpen(false)
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2.5 text-left text-xs font-medium transition-colors active:scale-[0.98] sm:rounded-2xl sm:px-3 sm:py-2.5 sm:text-md ${sortBy === option.value
                                ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                            >
                              <span>{option.label}</span>
                              {sortBy === option.value && (
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="ui-surface rounded-[1.5rem] px-6 py-20 text-center text-gray-400">กำลังโหลด...</div>
          ) : sortedTours.length === 0 ? (
            <div className="ui-surface rounded-[1.5rem] px-6 py-20 text-center">
              <p className="text-lg font-semibold text-gray-700">ไม่พบทัวร์ที่ตรงกับเงื่อนไข</p>
              <p className="mt-2 text-sm text-gray-400">ลองขยายช่วงราคา เปลี่ยนเดือน หรือเลือกตัวกรองให้น้อยลง</p>
            </div>
          ) : (
            <>
              {/* Count summary */}
              <p className="mb-3 text-sm text-gray-500">
                แสดง{' '}
                <span className="font-semibold text-gray-800">
                  {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sortedTours.length)}
                </span>{' '}
                จาก <span className="font-semibold text-gray-800">{sortedTours.length}</span> ทัวร์
              </p>

              <div className="mx-auto grid max-w-5xl grid-cols-2 gap-2.25 sm:gap-4 md:grid-cols-3 md:gap-4">
                {pagedTours.map((tour) => (
                  <TourCard
                    key={tour.id}
                    tour={tour}
                    isFavorite={isFavorite(tour.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>

              {/* Pagination bar */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-1.5">
                  {/* Prev */}
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => goToPage(currentPage - 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-30"
                    aria-label="หน้าก่อนหน้า"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m15 19-7-7 7-7" />
                    </svg>
                  </button>

                  {/* Page numbers with ellipsis */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      if (totalPages <= 7) return true
                      if (page === 1 || page === totalPages) return true
                      if (Math.abs(page - currentPage) <= 1) return true
                      return false
                    })
                    .reduce<(number | '...')[]>((acc, page, idx, arr) => {
                      if (idx > 0 && typeof arr[idx - 1] === 'number' && (page as number) - (arr[idx - 1] as number) > 1) {
                        acc.push('...')
                      }
                      acc.push(page)
                      return acc
                    }, [])
                    .map((item, idx) =>
                      item === '...' ? (
                        <span key={`ellipsis-${idx}`} className="flex h-9 w-9 items-center justify-center text-sm text-gray-400">…</span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          onClick={() => goToPage(item as number)}
                          className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                            currentPage === item
                              ? 'bg-[var(--color-primary)] text-white shadow-md scale-105'
                              : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                          aria-current={currentPage === item ? 'page' : undefined}
                        >
                          {item}
                        </button>
                      ),
                    )
                  }

                  {/* Next */}
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => goToPage(currentPage + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-30"
                    aria-label="หน้าถัดไป"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[var(--z-drawer)] lg:hidden">
          <button
            type="button"
            aria-label="ปิดตัวกรอง"
            className="ui-overlay absolute inset-0"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div ref={mobileFiltersDrawerRef} className="animate-slide-up absolute inset-x-4 bottom-4 top-4 overflow-y-auto overscroll-contain">
            <FilterSidebar
              region={region}
              province={province}
              tourType={tourType}
              search={search}
              categories={categories}
              year={year}
              month={month}
              minPrice={minPrice ?? priceBounds.min}
              maxPrice={maxPrice ?? priceBounds.max}
              priceBounds={priceBounds}
              availableCategories={availableCategories}
              availableMonths={availableMonths}
              onRegionChange={setRegion}
              onProvinceChange={setProvince}
              onTourTypeChange={setTourType}
              onCategoryToggle={toggleCategory}
              onYearChange={handleYearChange}
              onMonthChange={setMonth}
              onMinPriceChange={handleMinPriceChange}
              onMaxPriceChange={handleMaxPriceChange}
              festivals={festivals}
              festivalId={festivalId}
              onFestivalChange={setFestivalId}
              onClear={clearFilters}
              mode="drawer"
              onClose={() => setMobileFiltersOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
