import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { TourView } from './entities/tour-view.entity';
import { Tour, TourType } from '../tours/entities/tour.entity';
import { TourSchedule } from '../tours/entities/tour-schedule.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Review } from '../reviews/entities/review.entity';
import { Notification, NotificationType } from '../notifications/entities/notification.entity';
import { FavoriteTour } from '../favorites/entities/favorite-tour.entity';
import { DashboardStatsDaily } from './entities/dashboard-stats-daily.entity';
import { BehaviorEvent } from './entities/behavior-event.entity';
import * as bcrypt from 'bcrypt';
import {
    ENRICHED_CUSTOMERS,
    THAI_TRAVELER_NAMES,
    SPECIAL_REQUESTS,
    ADMIN_NOTES_POOL,
    THAI_REVIEW_COMMENTS,
    NOTIFICATION_TEMPLATES,
    BEHAVIOR_EVENT_TYPES,
    dashboardToursSeed,
    TourSeed,
} from './dashboard-seed.data';

@Injectable()
export class DashboardSeederService implements OnModuleInit {
    constructor(
        @InjectRepository(Tour)
        private toursRepo: Repository<Tour>,
        @InjectRepository(TourSchedule)
        private schedulesRepo: Repository<TourSchedule>,
        @InjectRepository(User)
        private usersRepo: Repository<User>,
        @InjectRepository(Booking)
        private bookingsRepo: Repository<Booking>,
        @InjectRepository(TourView)
        private tourViewsRepo: Repository<TourView>,
        @InjectRepository(Payment)
        private paymentsRepo: Repository<Payment>,
        @InjectRepository(Review)
        private reviewsRepo: Repository<Review>,
        @InjectRepository(Notification)
        private notificationsRepo: Repository<Notification>,
        @InjectRepository(FavoriteTour)
        private favoritesRepo: Repository<FavoriteTour>,
        @InjectRepository(DashboardStatsDaily)
        private dailyStatsRepo: Repository<DashboardStatsDaily>,
        @InjectRepository(BehaviorEvent)
        private behaviorEventsRepo: Repository<BehaviorEvent>,
    ) { }

    async onModuleInit() {
        if (String(process.env.ENABLE_DEMO_DASHBOARD_SEED ?? '').trim().toLowerCase() !== 'true') {
            return;
        }

        try {
            // ── เช็คว่ามี tour ใน DB แล้วหรือยัง ──
            const tourCount = await this.toursRepo.count();
            if (tourCount > 0) {
                console.log(`✅ Dashboard seed: tours already exist (${tourCount}), skipping...`);
                return;
            }

            console.log('🌱 Dashboard seed: seeding 30 Thai-language tour records...');

            // ──────── 1. ใช้ข้อมูลจาก dashboardToursSeed TypeScript ────────
            const toursList: TourSeed[] = dashboardToursSeed;

            // ──────── 2. สร้าง Tours และ Schedules จาก dashboardToursSeed ────────
            const savedTours: Tour[] = [];
            const allScheduleIds: number[] = [];

            for (const t of toursList) {
                const tour = this.toursRepo.create({
                    tourCode: t.tourCode,
                    name: t.name,
                    description: t.description,
                    tourType: t.tourType as TourType,
                    categories: t.categories || [],
                    price: t.price,
                    childPrice: t.childPrice ?? null,
                    originalPrice: t.originalPrice ?? null,
                    images: t.images || [],
                    highlights: t.highlights || [],
                    itinerary: t.itinerary || [],
                    transportation: t.transportation || '',
                    duration: t.duration || '',
                    region: t.region || '',
                    province: t.province || '',
                    accommodation: t.accommodation ?? null,
                    rating: t.rating || 0,
                    reviewCount: t.reviewCount || 0,
                    isActive: t.isActive !== undefined ? t.isActive : true,
                });

                const savedTour = await this.toursRepo.save(tour);
                savedTours.push(savedTour);

                if (t.schedules && Array.isArray(t.schedules)) {
                    for (const s of t.schedules) {
                        const schedule = this.schedulesRepo.create({
                            tour: savedTour,
                            startDate: s.startDate,
                            endDate: s.endDate,
                            timeSlot: s.timeSlot ?? null,
                            roundName: s.roundName ?? null,
                            maxCapacity: s.maxCapacity || 20,
                            currentBooked: s.currentBooked || 0,
                        });
                        const savedSchedule = await this.schedulesRepo.save(schedule);
                        allScheduleIds.push(savedSchedule.id);
                    }
                }
            }
            console.log(`   ✅ Seeded ${savedTours.length} tours and ${allScheduleIds.length} schedules`);


            // ──────── 3. สร้าง Users (customers) ────────
            const hashedPassword = await bcrypt.hash('password123', 10);

            let admin = await this.usersRepo.findOne({ where: { email: 'admin@9tours.com' } });
            if (!admin) {
                admin = await this.usersRepo.save({
                    name: 'Admin 9Tours',
                    email: 'admin@9tours.com',
                    phone: '0810000000',
                    password: hashedPassword,
                    role: UserRole.ADMIN,
                });
            }

            const savedCustomers: User[] = [];
            for (const c of ENRICHED_CUSTOMERS) {
                const existing = await this.usersRepo.findOne({ where: { email: c.email } });
                if (!existing) {
                    const user = await this.usersRepo.save({
                        name: c.name,
                        email: c.email,
                        phone: c.phone,
                        prefix: c.prefix,
                        password: hashedPassword,
                        role: UserRole.CUSTOMER,
                    });
                    savedCustomers.push(user);
                } else {
                    savedCustomers.push(existing);
                }
            }
            console.log(`   ✅ Seeded ${savedCustomers.length} customers + admin`);

            // ──────── 4. สร้าง Bookings ────────
            const now = new Date();
            const statuses = [
                BookingStatus.SUCCESS,
                BookingStatus.SUCCESS,
                BookingStatus.PENDING_PAYMENT,
                BookingStatus.AWAITING_APPROVAL,
                BookingStatus.CANCELED,
                BookingStatus.SUCCESS,
                BookingStatus.REFUND_PENDING,
                BookingStatus.SUCCESS,
            ];

            const savedBookings: Booking[] = [];
            if (allScheduleIds.length > 0) {
                for (let i = 0; i < 40; i++) {
                    const customer = savedCustomers[i % savedCustomers.length];
                    const enrichedData = ENRICHED_CUSTOMERS[i % ENRICHED_CUSTOMERS.length];
                    const scheduleId = allScheduleIds[i % allScheduleIds.length];
                    const status = statuses[i % statuses.length];
                    const adults = Math.floor((i % 3)) + 1;          // 1-3
                    const children = i % 4 === 0 ? 1 : 0;            // บางคนมีเด็ก
                    const totalPrice = (savedTours[i % savedTours.length]?.price ?? 2000) * adults
                        + (children > 0 ? (savedTours[i % savedTours.length]?.childPrice ?? 1500) * children : 0);

                    const daysAgo = (i * 3) % 60;
                    const bookingDate = new Date(now);
                    bookingDate.setDate(bookingDate.getDate() - daysAgo);

                    // สร้าง travelers info
                    const travelersInfo: { name: string; isLeadTraveler?: boolean }[] = [];
                    travelersInfo.push({ name: enrichedData.name, isLeadTraveler: true });
                    for (let t = 1; t < adults + children; t++) {
                        travelersInfo.push({ name: THAI_TRAVELER_NAMES[(i + t) % THAI_TRAVELER_NAMES.length] });
                    }

                    const specialRequest = SPECIAL_REQUESTS[i % SPECIAL_REQUESTS.length];
                    const adminNotes = [BookingStatus.SUCCESS, BookingStatus.AWAITING_APPROVAL].includes(status)
                        ? ADMIN_NOTES_POOL[i % ADMIN_NOTES_POOL.length]
                        : null;

                    const raw: Record<string, unknown> = {
                        userId: customer.id,
                        scheduleId,
                        paxCount: adults + children,
                        adults,
                        children,
                        totalPrice,
                        contactPrefix: enrichedData.prefix,
                        contactName: enrichedData.name,
                        contactEmail: enrichedData.email,
                        contactPhone: enrichedData.phone,
                        status,
                        travelersInfo,
                        specialRequest: specialRequest ?? null,
                        adminNotes: adminNotes ?? null,
                        createdAt: bookingDate,
                    };
                    const bookingEntity = Object.assign(this.bookingsRepo.create(), raw);
                    const savedBooking = await this.bookingsRepo.save(bookingEntity);
                    savedBookings.push(Array.isArray(savedBooking) ? savedBooking[0] : savedBooking);
                }
                console.log(`   ✅ Seeded ${savedBookings.length} bookings`);
            }

            // ──────── 5. สร้าง TourViews ────────
            const viewsToSave: Partial<TourView>[] = [];
            for (let i = 0; i < 150; i++) {
                const tour = savedTours[i % savedTours.length];
                const customer = savedCustomers[i % savedCustomers.length];
                const daysAgo = Math.floor((i * 0.4) % 60);
                const viewDate = new Date(now);
                viewDate.setDate(viewDate.getDate() - daysAgo);

                viewsToSave.push({
                    tourId: tour.id,
                    userId: customer.id as any,
                    viewedAt: viewDate,
                    sessionId: `session_${i}_${Date.now()}`,
                });
            }
            await this.tourViewsRepo.save(viewsToSave);
            console.log(`   ✅ Seeded ${viewsToSave.length} tour views`);

            // ──────── 6. สร้าง Payments ────────
            const payableStatuses = [
                BookingStatus.AWAITING_APPROVAL,
                BookingStatus.SUCCESS,
                BookingStatus.REFUND_PENDING,
                BookingStatus.REFUND_COMPLETED,
            ];

            let paymentCount = 0;
            for (const booking of savedBookings) {
                if (!payableStatuses.includes(booking.status)) continue;

                const isVerified = booking.status === BookingStatus.SUCCESS;
                const verifiedAt = isVerified ? new Date(new Date(booking.createdAt).getTime() + 3600_000) : null;

                await this.paymentsRepo.save({
                    bookingId: booking.id,
                    amountPaid: booking.totalPrice,
                    slipUrl: `/uploads/slips/slip_booking_${booking.id}.jpg`,
                    paymentMethod: 'PromptPay',
                    uploadedByUserId: booking.userId,
                    verificationStatus: isVerified ? 'verified' : 'pending',
                    verifiedAmount: isVerified ? booking.totalPrice : null,
                    verifiedTransRef: isVerified ? `TXN${String(booking.id).padStart(8, '0')}` : null,
                    verifiedAt,
                    verificationProvider: isVerified ? 'slip2go' : null,
                    verificationMessage: isVerified ? 'ตรวจสลิปผ่าน' : null,
                });
                paymentCount++;
            }
            console.log(`   ✅ Seeded ${paymentCount} payments`);

            // ──────── 7. สร้าง Reviews ────────
            // ต้องรู้ tourId ของแต่ละ booking → ผ่าน schedule
            const allSchedules = await this.schedulesRepo.find();
            const scheduleMap = new Map(allSchedules.map((s) => [s.id, s.tourId]));

            const successBookings = savedBookings.filter((b) => b.status === BookingStatus.SUCCESS);
            let reviewCount = 0;
            const reviewedBookingIds = new Set<number>();

            for (let i = 0; i < successBookings.length && i < THAI_REVIEW_COMMENTS.length; i++) {
                const booking = successBookings[i];
                if (reviewedBookingIds.has(booking.id)) continue;

                const tourId = scheduleMap.get(booking.scheduleId);
                if (!tourId) continue;

                const { rating, comment } = THAI_REVIEW_COMMENTS[i % THAI_REVIEW_COMMENTS.length];
                const reviewDate = new Date(booking.createdAt);
                reviewDate.setDate(reviewDate.getDate() + 3); // รีวิวหลังทริป 3 วัน

                await this.reviewsRepo.save({
                    bookingId: booking.id,
                    userId: booking.userId,
                    tourId,
                    rating,
                    comment,
                    createdAt: reviewDate,
                });
                reviewedBookingIds.add(booking.id);
                reviewCount++;
            }

            // อัปเดต rating และ reviewCount ของแต่ละ tour
            const reviews = await this.reviewsRepo.find();
            const ratingMap: Map<number, number[]> = new Map();
            for (const r of reviews) {
                if (!ratingMap.has(r.tourId)) ratingMap.set(r.tourId, []);
                ratingMap.get(r.tourId)!.push(r.rating);
            }
            for (const [tourId, ratings] of ratingMap.entries()) {
                const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
                await this.toursRepo.update(tourId, {
                    rating: parseFloat(avg.toFixed(1)),
                    reviewCount: ratings.length,
                });
            }
            console.log(`   ✅ Seeded ${reviewCount} reviews`);

            // ──────── 8. สร้าง Notifications ────────
            let notifCount = 0;

            // หา tour names จาก scheduleId ของแต่ละ booking
            const tourMap = new Map(savedTours.map((t) => [t.id, t.name]));

            for (const booking of savedBookings) {
                const tourId = scheduleMap.get(booking.scheduleId);
                const tourName = tourId ? (tourMap.get(tourId) ?? 'ทัวร์') : 'ทัวร์';
                const customerName = booking.contactName ?? 'ลูกค้า';

                // แจ้งเตือน admin สำหรับทุก booking ที่ไม่ใช่ pending_payment
                if (booking.status !== BookingStatus.PENDING_PAYMENT) {
                    const adminTemplate = NOTIFICATION_TEMPLATES.find(
                        (t) => t.type === 'new_booking',
                    )!;
                    await this.notificationsRepo.save({
                        userId: admin!.id,
                        bookingId: booking.id,
                        type: NotificationType.NEW_BOOKING,
                        title: adminTemplate.title,
                        message: adminTemplate.message(tourName, booking.id, customerName),
                        isRead: Math.random() > 0.4,
                    });
                    notifCount++;

                    // แจ้งเตือน payment_uploaded สำหรับ awaiting_approval
                    if (booking.status === BookingStatus.AWAITING_APPROVAL) {
                        const payTemplate = NOTIFICATION_TEMPLATES.find(
                            (t) => t.type === 'payment_uploaded',
                        )!;
                        await this.notificationsRepo.save({
                            userId: admin!.id,
                            bookingId: booking.id,
                            type: NotificationType.PAYMENT_UPLOADED,
                            title: payTemplate.title,
                            message: payTemplate.message(tourName, booking.id, customerName),
                            isRead: false,
                        });
                        notifCount++;
                    }
                }

                // แจ้งเตือนให้ลูกค้าตาม status
                if (booking.status === BookingStatus.SUCCESS) {
                    const template = NOTIFICATION_TEMPLATES.find((t) => t.type === 'booking_success')!;
                    await this.notificationsRepo.save({
                        userId: booking.userId,
                        bookingId: booking.id,
                        type: NotificationType.BOOKING_SUCCESS,
                        title: template.title,
                        message: template.message(tourName, booking.id),
                        isRead: Math.random() > 0.3,
                    });
                    notifCount++;
                } else if (booking.status === BookingStatus.AWAITING_APPROVAL) {
                    const template = NOTIFICATION_TEMPLATES.find((t) => t.type === 'booking_confirmed')!;
                    await this.notificationsRepo.save({
                        userId: booking.userId,
                        bookingId: booking.id,
                        type: NotificationType.BOOKING_CONFIRMED,
                        title: template.title,
                        message: template.message(tourName, booking.id),
                        isRead: Math.random() > 0.5,
                    });
                    notifCount++;
                } else if (booking.status === BookingStatus.CANCELED) {
                    const template = NOTIFICATION_TEMPLATES.find((t) => t.type === 'booking_canceled')!;
                    await this.notificationsRepo.save({
                        userId: booking.userId,
                        bookingId: booking.id,
                        type: NotificationType.BOOKING_CANCELED,
                        title: template.title,
                        message: template.message(tourName, booking.id),
                        isRead: Math.random() > 0.6,
                    });
                    notifCount++;
                }
            }
            console.log(`   ✅ Seeded ${notifCount} notifications`);

            // ──────── 9. สร้าง Favorites ────────
            const favoritePairs = new Set<string>();
            const favoritesToSave: Partial<FavoriteTour>[] = [];

            for (let i = 0; i < savedCustomers.length; i++) {
                const customer = savedCustomers[i];
                const numFavorites = 3 + (i % 3); // 3-5 tours ต่อคน

                for (let j = 0; j < numFavorites; j++) {
                    const tourIndex = (i * 3 + j * 7) % savedTours.length;
                    const tour = savedTours[tourIndex];
                    const key = `${customer.id}_${tour.id}`;
                    if (favoritePairs.has(key)) continue;
                    favoritePairs.add(key);

                    favoritesToSave.push({
                        userId: customer.id,
                        tourId: tour.id,
                    });
                }
            }
            await this.favoritesRepo.save(favoritesToSave);
            console.log(`   ✅ Seeded ${favoritesToSave.length} favorite tours`);

            // ──────── 10. สร้าง DashboardStatsDaily (60 วันย้อนหลัง) ────────
            const dailyStatsToSave: Partial<DashboardStatsDaily>[] = [];
            for (let daysAgo = 59; daysAgo >= 0; daysAgo--) {
                const date = new Date(now);
                date.setDate(date.getDate() - daysAgo);
                const dateStr = date.toISOString().slice(0, 10);

                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const baseViews = isWeekend ? 45 : 28;
                const totalViews = baseViews + Math.floor(Math.sin(daysAgo) * 15 + 15);
                const totalBookings = Math.floor(totalViews * 0.06 + Math.random() * 2);
                const avgPrice = 3200 + (daysAgo % 5) * 400;
                const totalRevenue = totalBookings * avgPrice;
                const newUsersCount = daysAgo % 7 === 0 ? 2 + (daysAgo % 3) : daysAgo % 4 === 0 ? 1 : 0;

                dailyStatsToSave.push({
                    date: dateStr,
                    totalViews,
                    totalBookings,
                    totalRevenue,
                    newUsersCount,
                });
            }
            await this.dailyStatsRepo.save(dailyStatsToSave);
            console.log(`   ✅ Seeded ${dailyStatsToSave.length} daily stats records`);

            // ──────── 11. สร้าง BehaviorEvents (30 วัน) ────────
            const behaviorEventsToSave: Partial<BehaviorEvent>[] = [];
            const userAgents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
                'Mozilla/5.0 (Android 13; Mobile; rv:109.0) Gecko/109.0 Firefox/109.0',
            ];

            for (let i = 0; i < 280; i++) {
                const eventConfig = BEHAVIOR_EVENT_TYPES[i % BEHAVIOR_EVENT_TYPES.length];
                const pagePath = eventConfig.paths[i % eventConfig.paths.length];
                const daysAgo = Math.floor((i * 0.11) % 30);
                const occurredAt = new Date(now);
                occurredAt.setDate(occurredAt.getDate() - daysAgo);
                occurredAt.setHours(8 + (i % 14), (i * 7) % 60, 0, 0);

                const customer = i % 3 === 0 ? null : savedCustomers[i % savedCustomers.length];
                const tourId = pagePath.startsWith('/tours/') ? savedTours[i % Math.min(10, savedTours.length)].id : null;

                behaviorEventsToSave.push({
                    eventType: eventConfig.type,
                    pagePath,
                    userId: customer?.id ?? null,
                    sessionId: `sess_${i % 50}_${daysAgo}`,
                    tourId,
                    occurredAt,
                    userAgent: userAgents[i % userAgents.length],
                    dwellMs: eventConfig.type === 'scroll_depth' ? 3000 + (i % 20) * 500 : null,
                });
            }
            await this.behaviorEventsRepo.save(behaviorEventsToSave);
            console.log(`   ✅ Seeded ${behaviorEventsToSave.length} behavior events`);

            console.log('🎉 Dashboard seed: complete!');
        } catch (error) {
            console.error('❌ Dashboard seed error:', error);
        }
    }
}
