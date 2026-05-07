import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { dashboardService, EMPTY_DASHBOARD_DATA, type DashboardData, type DashboardFilters } from '../../services/dashboardService'

import ThailandMap from '../../components/ThailandMap'

const COLORS = ['#F5A623', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899']
const PIE_COLORS = ['#F5A623', '#3B82F6', '#10B981', '#8B5CF6']
const PROVINCE_METRIC_OPTIONS = [
  { key: 'views', label: 'จำนวนวิว', emptyLabel: 'ยังไม่มีข้อมูลการเข้าชม' },
  { key: 'bookings', label: 'จำนวนการจอง', emptyLabel: 'ยังไม่มีข้อมูลการจอง' },
  { key: 'revenue', label: 'รายได้รวม', emptyLabel: 'ยังไม่มีข้อมูลรายได้' },
  { key: 'tourCount', label: 'จำนวนทัวร์', emptyLabel: 'ยังไม่มีทัวร์ในจังหวัดนี้' },
  { key: 'conversionRate', label: 'อัตราแปลงผล', emptyLabel: 'ยังไม่มีข้อมูลอัตราแปลงผล' },
] as const
const REGION_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'ภาคเหนือ', label: 'ภาคเหนือ' },
  { value: 'ภาคตะวันออกเฉียงเหนือ', label: 'ภาคตะวันออกเฉียงเหนือ' },
  { value: 'ภาคกลาง', label: 'ภาคกลาง' },
  { value: 'ภาคตะวันออก', label: 'ภาคตะวันออก' },
  { value: 'ภาคตะวันตก', label: 'ภาคตะวันตก' },
  { value: 'ภาคใต้', label: 'ภาคใต้' },
]

type ProvinceMetricKey = typeof PROVINCE_METRIC_OPTIONS[number]['key']

function formatMetricValue(metric: ProvinceMetricKey, value: number) {
  if (metric === 'views') return `${value.toLocaleString()} วิว`
  if (metric === 'bookings') return `${value.toLocaleString()} รายการจอง`
  if (metric === 'revenue') return `฿${value.toLocaleString()}`
  if (metric === 'tourCount') return `${value.toLocaleString()} ทัวร์`
  if (metric === 'conversionRate') return `${value.toFixed(1)}%`
  return value.toLocaleString()
}

function truncateTourName(name: string, maxLength = 32) {
  if (name.length <= maxLength) return name
  return `${name.slice(0, maxLength).trimEnd()}...`
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="ui-surface rounded-[1.5rem] border border-gray-100 bg-white p-4">
      <div className="h-1 w-14 rounded-full" style={{ backgroundColor: accent }} />
      <p className="mt-4 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  )
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [filterRegion, setFilterRegion] = useState('all')
  const [filterTourType, setFilterTourType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProvinceMetric, setSelectedProvinceMetric] = useState<ProvinceMetricKey>('views')

  const buildFilters = useCallback((): DashboardFilters => {
    const filters: DashboardFilters = {}
    if (filterStartDate) filters.startDate = filterStartDate
    if (filterEndDate) filters.endDate = filterEndDate
    if (filterRegion && filterRegion !== 'all') filters.region = filterRegion
    if (filterTourType && filterTourType !== 'all') filters.tourType = filterTourType
    return filters
  }, [filterStartDate, filterEndDate, filterRegion, filterTourType])

  const fetchData = useCallback(async (filters: DashboardFilters = {}) => {
    setLoading(true)
    setError('')

    try {
      const nextData = await dashboardService.getData(filters)
      setData(nextData)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'ไม่สามารถโหลดข้อมูลแดชบอร์ดได้')
      setData((current) => current ?? null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData(buildFilters())
  }, [fetchData, buildFilters])

  const handleApplyFilters = () => {
    void fetchData(buildFilters())
  }

  const safeData = data ?? EMPTY_DASHBOARD_DATA
  const { summaryCards, topTours, bookingsByStatus, regionStats, provinceMetricStats, viewsOverTime, bookingsOverTime, conversionRate } = safeData
  const selectedProvinceMetricOption = PROVINCE_METRIC_OPTIONS.find((option) => option.key === selectedProvinceMetric) ?? PROVINCE_METRIC_OPTIONS[0]
  const selectedProvinceStats = provinceMetricStats[selectedProvinceMetric] ?? []

  const statusChartData = [
    { name: 'รอชำระ', value: (bookingsByStatus.pending_payment || 0) + (bookingsByStatus.awaiting_approval || 0), color: '#3B82F6' },
    { name: 'ชำระแล้ว', value: bookingsByStatus.success || 0, color: '#10B981' },
    { name: 'ยกเลิก', value: bookingsByStatus.canceled || 0, color: '#EF4444' },
    { name: 'คืนเงิน', value: (bookingsByStatus.refund_pending || 0) + (bookingsByStatus.refund_completed || 0), color: '#F5A623' },
  ]

  const pendingApproval = bookingsByStatus.awaiting_approval || 0
  const refundPending = bookingsByStatus.refund_pending || 0
  const thisMonthTotal = bookingsOverTime.reduce((sum, entry) => sum + entry.thisMonth, 0)
  const lastMonthTotal = bookingsOverTime.reduce((sum, entry) => sum + entry.lastMonth, 0)
  const currentMonthViews = viewsOverTime[viewsOverTime.length - 1]?.views || 0
  const lastMonthViews = viewsOverTime[viewsOverTime.length - 2]?.views || 0

  const filteredTopTours = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return topTours
    return topTours.filter((tour) => tour.name.toLowerCase().includes(term) || tour.province.toLowerCase().includes(term))
  }, [searchTerm, topTours])

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">แดชบอร์ด</h1>
      </div>

      <div className="ui-surface mb-5 rounded-[1.5rem] border border-gray-100 bg-white p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm">
              <span className="mb-2 block font-medium text-gray-500">ตั้งแต่</span>
              <div className="flex gap-2">
                <input type="date" value={filterStartDate} onChange={(event) => setFilterStartDate(event.target.value)} className="ui-focus-ring w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-primary focus:bg-white" />
                {filterStartDate && (
                  <button type="button" onClick={() => setFilterStartDate('')} className="rounded-2xl border border-gray-200 px-3 text-gray-400 hover:text-gray-600">✕</button>
                )}
              </div>
            </label>
            <label className="text-sm">
              <span className="mb-2 block font-medium text-gray-500">ถึง</span>
              <div className="flex gap-2">
                <input type="date" value={filterEndDate} onChange={(event) => setFilterEndDate(event.target.value)} className="ui-focus-ring w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-primary focus:bg-white" />
                {filterEndDate && (
                  <button type="button" onClick={() => setFilterEndDate('')} className="rounded-2xl border border-gray-200 px-3 text-gray-400 hover:text-gray-600">✕</button>
                )}
              </div>
            </label>
            <label className="text-sm">
              <span className="mb-2 block font-medium text-gray-500">ภูมิภาค</span>
              <select value={filterRegion} onChange={(event) => setFilterRegion(event.target.value)} className="ui-focus-ring w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-primary focus:bg-white">
                {REGION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-2 block font-medium text-gray-500">ประเภททัวร์</span>
              <select value={filterTourType} onChange={(event) => setFilterTourType(event.target.value)} className="ui-focus-ring w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-primary focus:bg-white">
                <option value="all">ทั้งหมด</option>
                <option value="one_day">วันเดย์ทริป</option>
                <option value="package">แพ็กเกจพร้อมที่พัก</option>
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:w-auto">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ค้นหาชื่อทัวร์หรือจังหวัด"
              className="ui-focus-ring rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white"
            />
            <button
              type="button"
              onClick={handleApplyFilters}
              disabled={loading}
              className="ui-focus-ring ui-pressable rounded-2xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
            >
              {loading ? 'กำลังโหลด...' : 'ตกลง'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-[1.5rem] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>{error}</p>
            <button
              type="button"
              onClick={handleApplyFilters}
              className="rounded-xl border border-red-300 bg-white px-4 py-2 font-semibold text-red-700 transition-colors hover:bg-red-100"
            >
              ลองใหม่
            </button>
          </div>
        </div>
      )}

      {!loading && !data ? (
        <div className="ui-surface rounded-[1.5rem] border border-gray-100 bg-white px-6 py-16 text-center">
          <p className="text-lg font-semibold text-gray-800">ยังไม่สามารถแสดงข้อมูลแดชบอร์ดได้</p>
          <p className="mt-2 text-sm text-gray-500">ระบบจะแสดงข้อความนี้แทนการปล่อยให้หน้าว่าง</p>
        </div>
      ) : (
        <>
          {loading && (
            <div className="mb-5 flex h-40 items-center justify-center rounded-[1.5rem] border border-gray-100 bg-white text-lg text-gray-400">
              กำลังโหลดแดชบอร์ด...
            </div>
          )}

          {pendingApproval > 0 && (
            <div className="mb-3 rounded-2xl border border-yellow-200 bg-yellow-50 px-5 py-3 text-sm text-yellow-800">
              รอยืนยันการทำรายการ: <strong>{pendingApproval}</strong> รายการ
            </div>
          )}
          {refundPending > 0 && (
            <div className="mb-5 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-3 text-sm text-orange-800">
              คำขอคืนเงินที่รอดำเนินการ: <strong>{refundPending}</strong> รายการ
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-6">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <SummaryCard label="ยอดขายทั้งหมด" value={`฿${summaryCards.totalRevenue.toLocaleString()}`} accent="#F5A623" />
                <SummaryCard label="รายการจอง" value={summaryCards.totalBookings.toLocaleString()} accent="#3B82F6" />
                <SummaryCard label="การดู" value={summaryCards.totalViews.toLocaleString()} accent="#10B981" />
                <SummaryCard label="รออนุมัติ" value={summaryCards.totalPendingApprovals.toLocaleString()} accent="#EF4444" />
              </div>

              <div className="ui-surface rounded-[1.5rem] border border-gray-100 bg-white p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h2 className="font-bold text-gray-900">ทัวร์ที่ได้รับความนิยม</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-[500px] w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-md text-gray-500">
                        <th className="w-10 pb-3">ที่</th>
                        <th className="pb-3">ชื่อทัวร์</th>
                        <th className="pb-3">ความนิยม</th>
                        <th className="pb-3 text-left">ยอดขาย</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTopTours.map((tour) => (
                        <tr key={tour.rank} className="border-t border-gray-100">
                          <td className="py-3 font-mono text-gray-600">{String(tour.rank).padStart(2, '0')}</td>
                          <td className="py-3 pr-0">
                            <p className="max-w-[10rem] truncate font-medium text-gray-800">{truncateTourName(tour.name)}</p>
                            <p className="text-sm text-gray-500">{tour.province}</p>
                          </td>
                          <td className="py-3 w-50">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-14 rounded-full bg-gray-100">
                                <div className="h-2 rounded-full bg-blue-400" style={{ width: `${Math.min(tour.popularityPercent, 100)}%` }} />
                              </div>
                              <span className="w-10 text-right text-sm text-gray-500">{tour.popularityPercent}%</span>
                            </div>
                            <p className="mt-1 text-sm text-gray-400">{tour.bookingCount.toLocaleString()} จอง • {tour.viewCount.toLocaleString()} วิว</p>
                          </td>
                          <td className="py-3 text-left text-gray-700">{tour.revenue > 0 ? `฿${tour.revenue.toLocaleString()}` : 'ยังไม่มีรายได้'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="ui-surface rounded-[1.5rem] border border-gray-100 bg-white p-5">
                  <h2 className="mb-3 font-bold text-gray-900">ความนิยมแยกตามภูมิภาค</h2>
                  <div className="flex items-center gap-4">
                    <div className="h-32 w-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={regionStats} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={25}>
                            {regionStats.map((_, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-1.5 text-xs">
                      {regionStats.map((region, index) => (
                        <div key={region.name} className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                          <span className="flex-1 text-gray-700">{region.name}</span>
                          <span className="font-medium text-gray-500">{region.percent}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="ui-surface rounded-[1.5rem] border border-gray-100 bg-white p-5">
                  <h2 className="mb-3 font-bold text-gray-900">สถานะการจอง</h2>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {statusChartData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-5">
                <div className="ui-surface rounded-[1.5rem] border border-gray-100 bg-white p-5 md:col-span-3">
                  <h2 className="mb-3 font-bold text-gray-900">ยอดคำสั่งซื้อ</h2>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bookingsOverTime} barCategoryGap="20%" barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="day"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v: number) => (v % 5 === 1 || v === 1 ? String(v) : '')}
                          interval={0}
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          allowDecimals={false}
                          width={24}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => [value, name]}
                          labelFormatter={(label) => `วันที่ ${label}`}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="lastMonth" name="เดือนที่แล้ว" fill="#D1D5DB" radius={[3, 3, 0, 0]} maxBarSize={14} />
                        <Bar dataKey="thisMonth" name="เดือนนี้" fill="#F5A623" radius={[3, 3, 0, 0]} maxBarSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 flex items-center gap-8 text-center">
                    <div>
                      <p className="text-xs text-gray-400">เดือนที่แล้ว</p>
                      <p className="text-lg font-bold text-gray-800">{lastMonthTotal.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">เดือนนี้</p>
                      <p className="text-lg font-bold text-gray-800">{thisMonthTotal.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 md:col-span-2">
                  <div className="ui-surface rounded-[1.5rem] border border-gray-100 bg-white p-5 text-center">
                    <h2 className="mb-2 font-bold text-gray-900">อัตราแปลงผล</h2>
                    <p className="text-4xl font-extrabold text-yellow-500">{conversionRate}%</p>
                    <p className="mt-1 text-xs text-gray-400">จากผู้เข้าชมสู่การชำระเงิน</p>
                  </div>

                  <div className="ui-surface rounded-[1.5rem] border border-gray-100 bg-white p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h2 className="text-sm font-bold text-gray-900">ภาพรวมตามจังหวัด</h2>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                        {selectedProvinceMetricOption.label}
                      </span>
                    </div>
                    <div className="space-y-2 text-xs">
                      {selectedProvinceStats.slice(0, 6).map((province, index) => (
                        <div key={province.name} className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="flex-1 truncate text-gray-700">{province.name}</span>
                          <span className="font-medium text-gray-500">{formatMetricValue(selectedProvinceMetric, province.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-5 lg:col-span-6">
              <div className="ui-surface rounded-[1.5rem] border border-gray-100 bg-white p-5">
                <h2 className="mb-3 font-bold text-gray-900">ยอดการดู</h2>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={viewsOverTime}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="views" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex items-center gap-8">
                  <div>
                    <p className="text-xs text-gray-400">เดือนที่แล้ว</p>
                    <p className="text-lg font-bold text-gray-800">{lastMonthViews.toLocaleString()} <span className="text-sm font-medium text-gray-400">คนดู</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">เดือนนี้</p>
                    <p className="text-lg font-bold text-gray-800">{currentMonthViews.toLocaleString()} <span className="text-sm font-medium text-gray-400">คนดู</span></p>
                  </div>
                </div>
              </div>

              <div className="ui-surface rounded-[1.5rem] border border-gray-100 bg-white p-5">
                <div className="mb-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-bold text-gray-900">แผนที่ประเทศไทยแยกตามจังหวัด</h2>
                    <p className="text-xs text-gray-400">สลับตัวชี้วัดเพื่อดูภาพจังหวัดในหลายมุมมอง</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PROVINCE_METRIC_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setSelectedProvinceMetric(option.key)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                          selectedProvinceMetric === option.key
                            ? 'bg-slate-900 text-white'
                            : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                {selectedProvinceStats.length > 0 ? (
                  <div className="h-[440px] lg:h-[520px]">
                    <ThailandMap
                      provinceStats={selectedProvinceStats}
                      metricLabel={selectedProvinceMetricOption.label}
                      emptyLabel={selectedProvinceMetricOption.emptyLabel}
                      valueFormatter={(value) => formatMetricValue(selectedProvinceMetric, value)}
                      shareFormatter={(percent) => `สัดส่วนบนแผนที่ ${percent}%`}
                    />
                  </div>
                ) : (
                  <div className="flex h-[440px] lg:h-[520px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
                    ยังไม่มีข้อมูลจังหวัดสำหรับตัวชี้วัดนี้
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
