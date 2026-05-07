import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import TourCard from '../components/TourCard'
import SearchBar from '../components/common/SearchBar'
import ScrollerArrowButton from '../components/common/ScrollerArrowButton'
import { useAuth } from '../context/AuthContext'
import { useFavoritesContext } from '../context/FavoritesContext'
import { tourService } from '../services/tourService'
import type { Tour } from '../types/tour'

const CATEGORIES = ['สายธรรมชาติ', 'สายคาเฟ่', 'สายกิจกรรม', 'สายมู', 'สายชิล']
const HERO_CATEGORY_LIMIT = 5

const PLACES = [
  { name: 'ที่ไหนก็ได้', image: '/images/anywhere-2.png', province: null as string | null },
  { name: 'สุราษฎร์ธานี', image: '/images/anywhere-1.png', province: 'สุราษฎร์ธานี' },
  { name: 'ภูเก็ต', image: '/images/anywhere-4.png', province: 'ภูเก็ต' },
  { name: 'เชียงใหม่', image: '/images/anywhere-3.png', province: 'เชียงใหม่' },
]

type Place = typeof PLACES[0]

type RailState = {
  canScrollLeft: boolean
  canScrollRight: boolean
}

function useRailState(ref: RefObject<HTMLDivElement | null>, deps: readonly unknown[] = []) {
  const [state, setState] = useState<RailState>({ canScrollLeft: false, canScrollRight: false })

  useEffect(() => {
    const element = ref.current
    if (!element) {
      setState({ canScrollLeft: false, canScrollRight: false })
      return
    }

    const updateState = () => {
      const { scrollLeft, clientWidth, scrollWidth } = element
      setState({
        canScrollLeft: scrollLeft > 8,
        canScrollRight: scrollLeft + clientWidth < scrollWidth - 8,
      })
    }

    updateState()
    element.addEventListener('scroll', updateState, { passive: true })
    window.addEventListener('resize', updateState)

    return () => {
      element.removeEventListener('scroll', updateState)
      window.removeEventListener('resize', updateState)
    }
  }, [ref, ...deps])

  return state
}

function scrollRow(ref: RefObject<HTMLDivElement | null>, amount: number) {
  ref.current?.scrollBy({ left: amount, behavior: 'smooth' })
}

function measureScrollAmount(
  ref: RefObject<HTMLDivElement | null>,
  narrowWidth: number,
  wideWidth: number,
  gap: number,
) {
  if (typeof window === 'undefined') {
    return narrowWidth + gap
  }

  const fallbackWidth = window.innerWidth >= 640 ? wideWidth : narrowWidth
  const fallbackSpacing = fallbackWidth + gap
  const element = ref.current
  if (!element) {
    return fallbackSpacing
  }

  const first = element.children[0] as HTMLElement | undefined
  if (!first) {
    return fallbackSpacing
  }

  const firstRect = first.getBoundingClientRect()
  const second = element.children[1] as HTMLElement | undefined
  const baseSpacing = second
    ? (() => {
        const secondRect = second.getBoundingClientRect()
        const delta = secondRect.left - firstRect.left
        return Number.isFinite(delta) && delta > 0 ? delta : firstRect.width + gap
      })()
    : firstRect.width + gap

  const reduction = fallbackSpacing * SCROLL_REDUCTION_RATIO
  const adjusted = baseSpacing - reduction
  return Math.max(adjusted, baseSpacing * 0.6)
}

const GAP_PX = 16
const PLACE_CARD_NARROW = 184
const PLACE_CARD_WIDE = 260
const TOUR_CARD_NARROW = 224
const TOUR_CARD_WIDE = 230
const SCROLL_REDUCTION_RATIO = 0.2

const getPlaceScrollAmount = (ref: RefObject<HTMLDivElement | null>) =>
  measureScrollAmount(ref, PLACE_CARD_NARROW, PLACE_CARD_WIDE, GAP_PX)

const getTourScrollAmount = (ref: RefObject<HTMLDivElement | null>) =>
  measureScrollAmount(ref, TOUR_CARD_NARROW, TOUR_CARD_WIDE, GAP_PX)

interface RailHeaderProps {
  title: string
  linkTo?: string
  linkLabel?: string
}

function RailHeader({ title, linkTo, linkLabel = 'ดูทั้งหมด' }: RailHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-lg font-bold tracking-[-0.02em] text-gray-900 sm:text-2xl">{title}</h2>
      {linkTo ? (
        <Link
          to={linkTo}
          className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-dark)]"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  )
}

interface RailShellProps {
  children: ReactNode
  scrollRef: RefObject<HTMLDivElement | null>
  canScrollLeft: boolean
  canScrollRight: boolean
  onPrev: () => void
  onNext: () => void
  className?: string
  showFade?: boolean
  showMobileArrows?: boolean
}

function RailShell({
  children,
  scrollRef,
  canScrollLeft,
  canScrollRight,
  onPrev,
  onNext,
  className = '',
  showFade = false,
  showMobileArrows = false,
}: RailShellProps) {
  const [showArrows, setShowArrows] = useState(() => (
    typeof window === 'undefined' ? true : (window.innerWidth >= 768 || showMobileArrows)
  ))

  useEffect(() => {
    const updateArrowVisibility = () => {
      setShowArrows(window.innerWidth >= 768 || showMobileArrows)
    }

    updateArrowVisibility()
    window.addEventListener('resize', updateArrowVisibility)

    return () => {
      window.removeEventListener('resize', updateArrowVisibility)
    }
  }, [showMobileArrows])

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className={`scrollbar-hide flex gap-4 overflow-x-auto px-0.5 py-2 pr-6 scroll-smooth sm:px-1 sm:pr-1 ${className}`.trim()}
        style={{ scrollPaddingInline: '0.875rem' }}
      >
        {children}
      </div>

      {showFade && canScrollLeft && <div className="ui-rail-fade-left" />}
      {showFade && canScrollRight && <div className="ui-rail-fade-right" />}

      {showArrows && canScrollLeft && (
        <ScrollerArrowButton
          direction="left"
          onClick={onPrev}
          className={`absolute top-1/2 z-10 -translate-y-1/2 ${showMobileArrows ? 'left-2 h-8 w-8 sm:left-4 sm:h-10 sm:w-10' : 'left-4 h-10 w-10'}`}
        />
      )}
      {showArrows && canScrollRight && (
        <ScrollerArrowButton
          direction="right"
          onClick={onNext}
          className={`absolute top-1/2 z-10 -translate-y-1/2 ${showMobileArrows ? 'right-2 h-8 w-8 sm:right-4 sm:h-10 sm:w-10' : 'right-4 h-10 w-10'}`}
        />
      )}
    </div>
  )
}

export default function HomePage() {
  const { user } = useAuth()
  const { isFavorite, toggleFavorite } = useFavoritesContext()
  const [tours, setTours] = useState<Tour[]>([])
  const [toursLoading, setToursLoading] = useState(true)
  const [recommendedTours, setRecommendedTours] = useState<Tour[]>([])
  const [recommendationLoading, setRecommendationLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [tourType, setTourType] = useState<'' | 'one_day' | 'package'>('')
  const [guests, setGuests] = useState(2)
  const [childrenCount, setChildrenCount] = useState(0)
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set())
  const [selectedPlace, setSelectedPlace] = useState<Place>(PLACES[0])
  const [inputFocused, setInputFocused] = useState(false)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const placeScrollRef = useRef<HTMLDivElement>(null)
  const tourScrollRef = useRef<HTMLDivElement>(null)
  const recommendationScrollRef = useRef<HTMLDivElement>(null)
  const resultsSectionRef = useRef<HTMLElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    tourService.getAll()
      .then(setTours)
      .catch(console.error)
      .finally(() => setToursLoading(false))
  }, [])

  // Debounce search for suggestions
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 200)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!user) {
      setRecommendedTours([])
      setRecommendationLoading(false)
      return
    }

    setRecommendationLoading(true)
    tourService.getRecommendations(8)
      .then((items) => setRecommendedTours(items))
      .catch(() => {
        setRecommendedTours(tours.slice(0, 8))
      })
      .finally(() => setRecommendationLoading(false))
  }, [user, tours])

  const placeRail = useRailState(placeScrollRef, [selectedPlace.name])
  const popularRail = useRailState(tourScrollRef, [toursLoading, selectedPlace.name, tours.length])
  const recommendationRail = useRailState(recommendationScrollRef, [recommendationLoading, recommendedTours.length])

  const toggleCategory = (category: string) => {
    setSelectedCats((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  const canSubmitHeroSearch = search.trim().length > 0 || selectedCats.size > 0 || Boolean(tourType)

  // Client-side suggestion data (province groups + matching tours)
  const suggestionData = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q || tours.length === 0) return { provinces: [], tours: [] }
    const matched = tours.filter((t) =>
      t.name.toLowerCase().includes(q)
      || t.province.toLowerCase().includes(q)
      || t.region.toLowerCase().includes(q)
      || t.categories.some((c) => c.toLowerCase().includes(q)),
    )
    const provinceMap = new Map<string, number>()
    matched.forEach((t) => provinceMap.set(t.province, (provinceMap.get(t.province) ?? 0) + 1))
    const provinces = Array.from(provinceMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
    const tourSuggestions = [...matched]
      .sort((a, b) => {
        const aHit = a.name.toLowerCase().includes(q) ? 1 : 0
        const bHit = b.name.toLowerCase().includes(q) ? 1 : 0
        return bHit - aHit
      })
      .slice(0, 5)
      .map((t) => ({ id: t.id, name: t.name, coverImage: t.images[0] ?? '', price: Number(t.price), province: t.province }))
    return { provinces, tours: tourSuggestions }
  }, [debouncedSearch, tours])

  const showSuggestions = inputFocused
    && debouncedSearch.trim().length > 0
    && (suggestionData.provinces.length > 0 || suggestionData.tours.length > 0)

  const handleSearch = useCallback(() => {
    const trimmedSearch = search.trim()
    if (!trimmedSearch && selectedCats.size === 0 && !tourType) return
    const params = new URLSearchParams()
    if (trimmedSearch) params.set('search', trimmedSearch)
    if (tourType) params.set('tourType', tourType)
    if (selectedCats.size > 0) params.set('categories', [...selectedCats].join(','))
    navigate(`/tours?${params.toString()}`)
    setInputFocused(false)
  }, [navigate, search, selectedCats, tourType])

  const handleSelectSuggestionProvince = useCallback((province: string) => {
    navigate(`/tours?province=${encodeURIComponent(province)}`)
    setInputFocused(false)
  }, [navigate])

  const handleSelectSuggestionTour = useCallback((tourId: number) => {
    navigate(`/tours/${tourId}`)
    setInputFocused(false)
  }, [navigate])

  const handlePlaceSelect = (place: Place) => {
    setSelectedPlace(place)
    requestAnimationFrame(() => {
      resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const displayedTours = selectedPlace.province
    ? tours.filter((tour) => tour.province === selectedPlace.province)
    : tours

  const heroCategoryCounts = tours.reduce((counts, tour) => {
    tour.categories.forEach((category) => {
      counts.set(category, (counts.get(category) ?? 0) + 1)
    })
    return counts
  }, new Map<string, number>())

  const heroCategories = (heroCategoryCounts.size > 0
    ? [...heroCategoryCounts.entries()]
      .filter(([category]) => category.startsWith('สาย'))
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1]
        return a[0].localeCompare(b[0], 'th')
      })
      .slice(0, HERO_CATEGORY_LIMIT)
      .map(([category]) => category)
    : CATEGORIES
  )

  const sectionTitle = selectedPlace.province
    ? `ทริปยอดนิยมใน${selectedPlace.name}`
    : 'ทริปยอดนิยมทั่วไทย'

  const emptyStateMessage = selectedPlace.province
    ? `ยังไม่มีทัวร์ใน${selectedPlace.name}`
    : 'ยังไม่มีทัวร์แนะนำในขณะนี้'

  return (
    <>
      <div className="mx-auto max-w-7xl px-3 pt-3 sm:px-6 sm:pt-6 lg:px-8">
        <section
          className="ui-home-hero relative overflow-hidden rounded-[2rem] border border-white/25 shadow-[0_24px_60px_rgba(15,23,42,0.16)] sm:rounded-[2.5rem]"
          style={{ backgroundImage: 'url(/hero-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,15,34,0.12)_0%,rgba(8,15,34,0.34)_42%,rgba(8,15,34,0.62)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,rgba(8,15,34,0)_0%,rgba(8,15,34,0.18)_40%,rgba(8,15,34,0.42)_100%)]" />
          <div className="relative z-10 px-4 py-8 text-center text-white sm:px-8 sm:py-14 lg:px-12 lg:py-16">
            <div className="ui-home-hero-copy mx-auto max-w-[18.5rem] sm:max-w-3xl">
              <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">เลือกสไตล์ที่ชอบ แล้วหาทริปที่ใช่</h1>
            </div>


            <div className="ui-home-hero-subcopy mx-auto mt-4 max-w-[18.5rem] text-center text-white sm:max-w-3xl">
              <p className="mt-10 text-sm font-semibold text-white/90 sm:text-[24px]">มองหาทริปแนวไหนอยู่? เลือกแล้วกดค้นหาเลย</p>
            </div>

            <div className="mx-auto mt-4 w-full max-w-full sm:mt-4 sm:max-w-4xl">
              <div className="relative">
                <div className="scrollbar-hide flex w-full flex-nowrap justify-start gap-1.5 overflow-x-auto pb-1 pr-8 sm:flex-wrap sm:justify-center sm:gap-3 sm:overflow-visible sm:pr-0 sm:pb-0">
                  {heroCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      aria-pressed={selectedCats.has(category)}
                      onClick={() => toggleCategory(category)}
                      className={`ui-pressable inline-flex min-h-[36px] shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold sm:min-h-0 sm:px-6 sm:py-2.5 sm:text-[15px] ${selectedCats.has(category)
                        ? 'bg-[var(--color-accent)] text-white shadow-[0_12px_24px_rgba(245,166,35,0.24)]'
                        : 'bg-white/92 text-gray-700 shadow-[0_8px_18px_rgba(15,23,42,0.1)] hover:bg-[rgba(245,166,35,0.85)] hover:text-white hover:shadow-[0_10px_20px_rgba(245,166,35,0.18)]'
                        }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-white/78 sm:hidden">
                <span className="h-1.5 w-1.5 rounded-full bg-white/85" />
                <span>เลื่อนดูหมวดหมู่เพิ่มเติม</span>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
                </svg>
              </div>
            </div>

            <div className="mx-auto mt-4 max-w-4xl sm:mt-6">
              <SearchBar
                search={search}
                setSearch={(v) => { setSearch(v); if (v.trim()) setInputFocused(true) }}
                guests={guests}
                setGuests={setGuests}
                childrenCount={childrenCount}
                setChildrenCount={setChildrenCount}
                onSearch={handleSearch}
                showGuests={false}
                searchDisabled={!canSubmitHeroSearch}
                className="max-w-4xl"
                transparent
                tourType={tourType}
                setTourType={setTourType}
                suggestionProvinces={suggestionData.provinces}
                suggestionTours={suggestionData.tours}
                showSuggestions={showSuggestions}
                onSelectSuggestionProvince={handleSelectSuggestionProvince}
                onSelectSuggestionTour={handleSelectSuggestionTour}
                onViewAllSuggestions={handleSearch}
                onSuggestionsClose={() => setInputFocused(false)}
              />
            </div>
          </div>
        </section>
      </div>

      <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-10 lg:px-8">
        <section className="mb-8 sm:mb-10">
          <RailHeader title="สถานที่ยอดนิยม" />
          <RailShell
            scrollRef={placeScrollRef}
            canScrollLeft={placeRail.canScrollLeft}
            canScrollRight={placeRail.canScrollRight}
            onPrev={() => scrollRow(placeScrollRef, -getPlaceScrollAmount(placeScrollRef))}
            onNext={() => scrollRow(placeScrollRef, getPlaceScrollAmount(placeScrollRef))}
            className="pb-3"
            showMobileArrows
          >
            {PLACES.map((place) => {
              const isSelected = selectedPlace.name === place.name

              return (
                <button
                  key={place.name}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handlePlaceSelect(place)}
                  className={`group relative h-[108px] w-[184px] flex-shrink-0 overflow-hidden rounded-[1.2rem] border-2 text-left transition-all sm:h-40 sm:w-[220px] sm:rounded-[1.2rem] lg:h-44 lg:w-[260px] ${isSelected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] shadow-[0_12px_28px_rgba(37,99,235,0.18)]'
                    : 'border-transparent bg-white/80 opacity-95 hover:border-white hover:opacity-100 hover:shadow-[0_10px_24px_rgba(15,23,42,0.10)]'
                    }`}
                >
                  <img
                    src={place.image}
                    alt={place.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className={`absolute inset-0 ${isSelected ? 'bg-gradient-to-t from-black/55 via-black/10 to-transparent' : 'bg-gradient-to-t from-black/60 via-black/15 to-transparent'}`} />
                  <div className="absolute inset-x-3 bottom-3 text-white sm:inset-x-4 sm:bottom-4">
                    <p className="text-[0.95rem] font-bold tracking-[-0.02em] sm:text-lg">{place.name}</p>
                  </div>
                </button>
              )
            })}
          </RailShell>
        </section>

        <section ref={resultsSectionRef} className="mb-8 scroll-mt-24 sm:mb-10">
          <RailHeader title={sectionTitle} linkTo={selectedPlace.province ? `/tours?province=${selectedPlace.province}` : '/tours'} />

          {toursLoading ? (
            <div className="ui-surface rounded-[1.5rem] px-6 py-14 text-center text-gray-400">กำลังโหลด...</div>
          ) : displayedTours.length === 0 ? (
            <div className="ui-surface rounded-[1.5rem] px-6 py-14 text-center text-gray-400">{emptyStateMessage}</div>
          ) : (
          <RailShell
            scrollRef={tourScrollRef}
            canScrollLeft={popularRail.canScrollLeft}
            canScrollRight={popularRail.canScrollRight}
            onPrev={() => scrollRow(tourScrollRef, -getTourScrollAmount(tourScrollRef))}
            onNext={() => scrollRow(tourScrollRef, getTourScrollAmount(tourScrollRef))}
            className="pb-2"
            showFade
            showMobileArrows
          >
              {displayedTours.map((tour) => (
                <div key={tour.id} className="w-[224px] flex-shrink-0 sm:w-[260px]">
                  <TourCard tour={tour} isFavorite={isFavorite(tour.id)} onToggleFavorite={toggleFavorite} />
                </div>
              ))}
            </RailShell>
          )}
        </section>

        {user && (
          <section>
            <RailHeader title="ทริปที่คุณอาจชอบ" linkTo="/tours" />

            {recommendationLoading ? (
              <div className="ui-surface rounded-[1.5rem] px-6 py-10 text-center text-gray-400">กำลังจัดอันดับทัวร์ที่เหมาะกับคุณ...</div>
            ) : recommendedTours.length === 0 ? (
              <div className="ui-surface rounded-[1.5rem] px-6 py-10 text-center text-gray-400">ยังไม่มีข้อมูลเพียงพอสำหรับคำแนะนำส่วนตัว</div>
            ) : (
              <RailShell
                scrollRef={recommendationScrollRef}
                canScrollLeft={recommendationRail.canScrollLeft}
                canScrollRight={recommendationRail.canScrollRight}
                onPrev={() => scrollRow(recommendationScrollRef, -getTourScrollAmount(recommendationScrollRef))}
                onNext={() => scrollRow(recommendationScrollRef, getTourScrollAmount(recommendationScrollRef))}
                className="pb-2"
                showFade
                showMobileArrows
              >
                {recommendedTours.map((tour) => (
                  <div key={tour.id} className="w-[224px] flex-shrink-0 sm:w-[260px]">
                    <TourCard tour={tour} isFavorite={isFavorite(tour.id)} onToggleFavorite={toggleFavorite} />
                  </div>
                ))}
              </RailShell>
            )}
          </section>
        )}
      </div>
    </>
  )
}
