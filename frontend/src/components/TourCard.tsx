import { Link } from 'react-router-dom'
import { trackEvent } from '../services/trackingService'
import type { Tour } from '../types/tour'

interface TourCardProps {
  tour: Tour
  isFavorite?: boolean
  isInactive?: boolean
  onToggleFavorite?: (tourId: number) => void
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
      <circle cx="12" cy="12" r="8.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5v5l3 2" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg className="h-7 w-7 flex-shrink-0 fill-current text-yellow-400" viewBox="0 0 20 23" aria-hidden="true">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  )
}

interface DetailItemProps {
  icon: 'clock' | 'check'
  text: string
}

function DetailItem({ icon, text }: DetailItemProps) {
  const iconNode = icon === 'clock'
    ? <ClockIcon />
    : <CheckIcon />

  return (
    <div className="flex items-center gap-2 text-[13px] sm:text-[15px] md:text-[17px] font-medium leading-[1.05] text-gray-600">
      {iconNode}
      <span className="line-clamp-1">{text}</span>
    </div>
  )
}

function getCardDetailItems(tour: Tour) {
  const secondLine = tour.highlights[0]?.trim() || 'รายละเอียดเด่นของทัวร์'
  const thirdLine = tour.tourType === 'package'
    ? tour.accommodation?.trim() || 'มีที่พักรวมในแพ็กเกจ'
    : tour.highlights[1]?.trim() || 'ไฮไลต์เพิ่มเติมของทริป'

  return [
    { icon: 'clock' as const, text: tour.duration },
    { icon: 'check' as const, text: secondLine },
    { icon: 'check' as const, text: thirdLine },
  ]
}

function HeartButton({ active, onClick }: { active: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? 'ลบออกจากรายการถูกใจ' : 'เพิ่มในรายการถูกใจ'}
      aria-pressed={active}
      className="ui-pressable absolute left-1.5 top-1.5 z-20 flex h-6 w-6 
      items-center justify-center rounded-[14px] border border-white/40 bg-gradient-to-b 
      from-white/10 to-slate-100/30 text-slate-100 shadow-[0_5px_15px_rgba(15,23,42,0.25)] 
      backdrop-blur transition-all hover:scale-105 hover:from-white/40 hover:to-white/40 
      active:scale-95 md:left-2.5 md:top-2.5 md:h-9 md:w-9"
    >
      <svg
        className={`h-4 w-4 transition-colors md:h-5 md:w-5 ${active ? 'fill-red-500 text-red-500' : 'fill-none text-gray-300'}`}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 0 : 2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  )
}

export default function TourCard({ tour, isFavorite = false, isInactive = false, onToggleFavorite }: TourCardProps) {
  const isPrivate = !!tour.minPeople
  const originalPrice = tour.originalPrice
  const hasDiscount = typeof originalPrice === 'number' && originalPrice > tour.price
  const discountPercent = hasDiscount
    ? Math.round((1 - tour.price / originalPrice) * 100)
    : null
  const coverImage = tour.images.find((image) => typeof image === 'string' && image.trim().length > 0) || ''
  const hasCoverImage = coverImage.length > 0
  const isPopular = tour.reviewCount > 50

  const detailItems = getCardDetailItems(tour)

  const metaText = isPopular ? 'ทัวร์ยอดนิยม' : 'ทัวร์แนะนำ'
  const cardClassName = 'group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-white/55 bg-white/84 shadow-[0_6px_18px_rgba(15,23,42,0.06)] backdrop-blur-[6px] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(15,23,42,0.1)] sm:rounded-[1rem] sm:border-white/60 sm:bg-white/88 sm:shadow-[0_4px_14px_rgba(15,23,42,0.05)]'
  const cardContent = (
    <>
      {onToggleFavorite && (
        <HeartButton
          active={isFavorite}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleFavorite(tour.id)
          }}
        />
      )}

      {hasDiscount && (
        <div className="absolute right-0 top-0 z-10 flex min-h-[1rem] min-w-[2rem] flex-col items-center justify-center rounded-bl-[1.15rem] rounded-tr-[0.25rem] bg-red-500 px-3 py-1.5 text-right text-white sm:px-3.5 sm:py-2 md:px-4 md:py-2.5">
          <p className="text-[0.85rem] font-black leading-none sm:text-[0.95rem] md:text-[1rem]">ลด {discountPercent}%</p>
          {tour.discountEndDate && (
            <p className="mt-0.5 text-[0.7rem] font-semibold leading-none text-white/80 sm:text-[0.75rem] md:text-[0.8rem]">
              ถึง {new Date(tour.discountEndDate + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
            </p>
          )}
        </div>
      )}

      {isInactive && (
        <div className="absolute inset-0 z-30 flex items-center justify-center rounded-[1.15rem] bg-black/40">
          <span className="rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-gray-700 shadow">
            ทัวร์นี้ปิดให้บริการชั่วคราว
          </span>
        </div>
      )}
      <div className="h-[128px] overflow-hidden border-b border-white/40 bg-slate-100/90 sm:h-[170px]">
        {hasCoverImage ? (
          <img
            src={coverImage.replace('w=800&q=80', 'w=400&q=70').replace('w=800', 'w=400')}
            alt={tour.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-6 text-center">
            <p className="text-md font-bold text-slate-600">ไม่มีภาพประกอบสำหรับทัวร์นี้</p>
          </div>
        )}
      </div>

      <div className="grid flex-1 grid-rows-[auto_auto_1fr_auto] px-4 pt-4 sm:px-3.5 sm:pt-3.5">
        <h3 className="line-clamp-2 text-[1rem] font-bold leading-[1.35] tracking-[-0.02em] text-gray-800 md:mt-2 md:text-[1.2rem]">
          {tour.name}
        </h3>

        <div className="mt-2 -ml-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] font-semibold text-gray-700 sm:mt-1 sm:-ml-1.5 sm:gap-x-3 sm:text-[15px] md:text-[16px]">
          <span className="inline-flex items-center gap-1 leading-none text-gray-700">
            <StarIcon />
            <span>{tour.rating.toFixed(1)}</span>
            <span className="text-gray-700">({tour.reviewCount.toLocaleString()} รีวิว)</span>
          </span>
          <span className="hidden text-gray-400 md:inline">|</span>
          <span className="hidden text-gray-700 md:inline">{metaText}</span>
        </div>

        <div className="mt-2 grid gap-1.5 sm:mt-0.5 sm:gap-1.25">
          {detailItems.map((item, index) => (
            <DetailItem key={`${item.text}-${index}`} icon={item.icon} text={item.text} />
          ))}
        </div>

        <div className="-mx-4 -mb-5.5 mt-3 border-t border-white/55 sm:-mx-3 sm:mt-2">
          <div className="relative min-h-[5.75rem] px-4 py-3 sm:min-h-[5.6rem] sm:px-3 sm:py-2">
            <div>
              <p className="text-[0.8rem] sm:text-[0.85rem] md:text-[0.9rem] font-semibold text-gray-700">
                {isPrivate ? 'ราคาเหมาส่วนตัว' : 'ราคาเริ่มต้น'}
              </p>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-gray-800">
                <span className="mt-1 text-[1.45rem] font-extrabold leading-none md:text-[1.6rem]">{Number(tour.price).toLocaleString()}</span>
                <span className="text-[0.9rem] sm:text-[0.9rem] md:text-[0.9rem] font-semibold text-gray-900">
                  {isPrivate ? 'บาท' : 'บาท / ท่าน'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )

  if (isInactive) {
    return (
      <div className={cardClassName} aria-disabled="true">
        {cardContent}
      </div>
    )
  }

  return (
    <Link
      to={`/tours/${tour.id}`}
      className={cardClassName}
      onClick={() => {
        trackEvent({
          eventType: 'cta_click',
          pagePath: window.location.pathname + window.location.search,
          tourId: tour.id,
          elementId: 'tour_card_click',
          metadata: { province: tour.province, tourType: tour.tourType },
        })
      }}
    >
      {cardContent}
    </Link>
  )
}
