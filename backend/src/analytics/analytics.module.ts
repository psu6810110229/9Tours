import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { TourView } from './entities/tour-view.entity';
import { DashboardStatsDaily } from './entities/dashboard-stats-daily.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { User } from '../users/entities/user.entity';
import { Tour } from '../tours/entities/tour.entity';
import { TourSchedule } from '../tours/entities/tour-schedule.entity';
import { DashboardSeederService } from './dashboard.seeder';
import { BehaviorEvent } from './entities/behavior-event.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { ToursModule } from '../tours/tours.module';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { Payment } from '../payments/entities/payment.entity';
import { Review } from '../reviews/entities/review.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { FavoriteTour } from '../favorites/entities/favorite-tour.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            TourView, DashboardStatsDaily, Booking, User, Tour, TourSchedule,
            BehaviorEvent, Payment, Review, Notification, FavoriteTour,
        ]),
        ToursModule,
    ],
    providers: [DashboardService, DashboardSeederService, EventsService, OptionalJwtAuthGuard],
    controllers: [DashboardController, EventsController],
})
export class AnalyticsModule { }
