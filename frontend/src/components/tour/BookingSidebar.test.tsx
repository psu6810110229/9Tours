import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BookingSidebar from './BookingSidebar'
import type { Tour } from '../../types/tour'

const navigateSpy = vi.fn()
const scrollToSpy = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  }
})

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}))

vi.mock('../../services/bookingService', () => ({
  bookingService: {
    getMyBookings: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('../../services/tourService', () => ({
  tourService: {
    getAvailableSeats: vi.fn().mockResolvedValue({ availableSeats: 8 }),
  },
}))

vi.mock('../../services/trackingService', () => ({
  trackEvent: vi.fn(),
}))

vi.mock('../LoginModal', () => ({
  default: () => null,
}))

vi.mock('./booking-sidebar/BookingPriceHeader', () => ({
  default: () => <div>price-header</div>,
}))

vi.mock('./booking-sidebar/BookingDateSelector', () => ({
  default: () => <div>date-selector</div>,
}))

vi.mock('./booking-sidebar/BookingGuestSelector', () => ({
  default: () => <div>guest-selector</div>,
}))

vi.mock('./booking-sidebar/BookingSummary', () => ({
  default: ({ buttonText, onBookingClick }: { buttonText: string; onBookingClick: () => void }) => (
    <button type="button" onClick={onBookingClick}>
      {buttonText}
    </button>
  ),
}))

const mockTour: Tour = {
  id: 99,
  tourCode: 'T-099',
  name: 'Test Tour',
  description: 'Drawer behavior test tour',
  tourType: 'one_day',
  price: 3200,
  childPrice: 1600,
  originalPrice: null,
  province: 'Phuket',
  region: 'South',
  categories: ['Island'],
  images: ['tour.jpg'],
  highlights: [],
  itinerary: [],
  transportation: 'Van',
  duration: '1 day',
  accommodation: null,
  rating: 4.8,
  reviewCount: 12,
  isActive: true,
  createdAt: '2099-01-01T00:00:00.000Z',
  updatedAt: '2099-01-02T00:00:00.000Z',
  schedules: [
    {
      id: 10,
      tourId: 99,
      startDate: '2099-04-01',
      endDate: '2099-04-01',
      maxCapacity: 12,
      currentBooked: 2,
      timeSlot: '09:00',
      roundName: 'Morning',
    },
  ],
}

function renderSidebar() {
  return render(
    <MemoryRouter>
      <BookingSidebar tour={mockTour} isMobileFixed />
    </MemoryRouter>,
  )
}

describe('BookingSidebar mobile drawer', () => {
  beforeEach(() => {
    navigateSpy.mockReset()
    scrollToSpy.mockReset()
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: scrollToSpy,
    })
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 240,
      writable: true,
    })
    document.body.className = ''
    document.body.removeAttribute('data-scroll-lock-count')
    document.body.removeAttribute('data-scroll-lock-padding-right')
    document.body.removeAttribute('data-scroll-lock-position')
    document.body.removeAttribute('data-scroll-lock-top')
    document.body.removeAttribute('data-scroll-lock-left')
    document.body.removeAttribute('data-scroll-lock-right')
    document.body.removeAttribute('data-scroll-lock-width')
    document.body.removeAttribute('data-scroll-lock-scroll-y')
    document.body.style.cssText = ''
  })

  afterEach(() => {
    document.body.className = ''
    document.body.style.cssText = ''
  })

  it('starts in peek state and opens from the handle/header', async () => {
    renderSidebar()

    const handle = screen.getByTestId('booking-drawer-handle')
    const content = screen.getByTestId('booking-drawer-content')

    expect(handle).toHaveAttribute('aria-expanded', 'false')
    expect(content.className).toContain('max-h-0')

    fireEvent.click(handle)

    await waitFor(() => {
      expect(handle).toHaveAttribute('aria-expanded', 'true')
      expect(document.body.classList.contains('ui-scroll-lock')).toBe(true)
    })
  })

  it('closes from the backdrop and restores the previous page scroll position', async () => {
    renderSidebar()

    fireEvent.click(screen.getByTestId('booking-drawer-handle'))

    await waitFor(() => {
      expect(document.body.classList.contains('ui-scroll-lock')).toBe(true)
    })

    fireEvent.click(screen.getByTestId('booking-drawer-backdrop'))

    await waitFor(() => {
      expect(document.body.classList.contains('ui-scroll-lock')).toBe(false)
      expect(scrollToSpy).toHaveBeenCalledWith(0, 240)
    })
  })

  it('opens and closes when dragging the header past the threshold', async () => {
    renderSidebar()

    const header = screen.getByTestId('booking-drawer-header')
    const handle = screen.getByTestId('booking-drawer-handle')

    fireEvent.touchStart(header, { touches: [{ clientY: 400 }] })
    fireEvent.touchMove(header, { touches: [{ clientY: 300 }] })
    fireEvent.touchEnd(header)

    await waitFor(() => {
      expect(handle).toHaveAttribute('aria-expanded', 'true')
    })

    fireEvent.touchStart(header, { touches: [{ clientY: 200 }] })
    fireEvent.touchMove(header, { touches: [{ clientY: 300 }] })
    fireEvent.touchEnd(header)

    await waitFor(() => {
      expect(handle).toHaveAttribute('aria-expanded', 'false')
    })
  })

  it('does not open when touching the scrollable content area', async () => {
    renderSidebar()

    const content = screen.getByTestId('booking-drawer-content')
    const handle = screen.getByTestId('booking-drawer-handle')

    fireEvent.touchStart(content, { touches: [{ clientY: 400 }] })
    fireEvent.touchMove(content, { touches: [{ clientY: 300 }] })
    fireEvent.touchEnd(content)

    await waitFor(() => {
      expect(handle).toHaveAttribute('aria-expanded', 'false')
    })
  })
})
