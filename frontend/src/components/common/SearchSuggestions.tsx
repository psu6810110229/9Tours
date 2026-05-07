import type React from 'react'

export interface SuggestionProvince {
  name: string
  count: number
}

export interface SuggestionTour {
  id: number
  name: string
  coverImage: string
  price: number
  province: string
}

interface Props {
  query: string
  provinces: SuggestionProvince[]
  tours: SuggestionTour[]
  onSelectProvince: (province: string) => void
  onSelectTour: (tourId: number) => void
  onViewAll: () => void
  style?: React.CSSProperties
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-amber-100 px-0.5 text-amber-800 not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function SearchSuggestions({
  query,
  provinces,
  tours,
  onSelectProvince,
  onSelectTour,
  onViewAll,
  style,
}: Props) {
  const hasProvinces = provinces.length > 0
  const hasTours = tours.length > 0
  if (!hasProvinces && !hasTours) return null

  return (
    <div
      // Prevent input blur when clicking inside dropdown
      onMouseDown={(e) => e.preventDefault()}
      className="ui-pop fixed z-[var(--z-dropdown)] max-h-[65vh] overflow-y-auto overscroll-contain rounded-2xl border border-white/70 bg-white shadow-[0_24px_56px_rgba(15,23,42,0.2)]"
      style={style}
    >
      {/* Provinces */}
      {hasProvinces && (
        <div className="px-3 pt-3">
          <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
            สถานที่
          </p>
          <div className="space-y-0.5">
            {provinces.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => onSelectProvince(p.name)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-gray-50"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[var(--color-primary)]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                <p className="min-w-0 flex-1 text-sm font-semibold text-gray-800">
                  <HighlightedText text={p.name} query={query} />
                </p>
                <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                  {p.count} ทัวร์
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {hasProvinces && hasTours && <div className="mx-4 my-2 border-t border-gray-100" />}

      {/* Tours */}
      {hasTours && (
        <div className={`px-3 ${hasProvinces ? '' : 'pt-3'}`}>
          <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
            ทัวร์ที่เกี่ยวข้อง
          </p>
          <div className="space-y-0.5">
            {tours.map((tour) => (
              <button
                key={tour.id}
                type="button"
                onClick={() => onSelectTour(tour.id)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-gray-50"
              >
                {tour.coverImage ? (
                  <img
                    src={tour.coverImage.replace('w=800&q=80', 'w=96&q=60').replace('w=800', 'w=96')}
                    alt={tour.name}
                    loading="lazy"
                    className="h-10 w-14 flex-shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-10 w-14 flex-shrink-0 rounded-lg bg-gray-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold text-gray-800">
                    <HighlightedText text={tour.name} query={query} />
                  </p>
                  <p className="text-xs font-medium text-gray-400">{tour.province}</p>
                </div>
                <span className="flex-shrink-0 text-sm font-bold text-[var(--color-primary)]">
                  ฿{tour.price.toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* View all */}
      <div className="mt-1 border-t border-gray-100 px-3 py-2">
        <button
          type="button"
          onClick={onViewAll}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--color-primary)] transition-colors hover:bg-blue-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <circle cx="11" cy="11" r="7.5" />
            <path d="m20 20-3.8-3.8" strokeLinecap="round" />
          </svg>
          ดูผลทั้งหมดสำหรับ &ldquo;{query}&rdquo;
        </button>
      </div>
    </div>
  )
}
