import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ActivityController } from './api/activity.controller';
import { ActivityUserPreconditionsService } from './application/services/activity-user-preconditions.service';
import { CreateGeneratedActivityUseCase } from './application/use-cases/create-generated-activity.use-case';
import { GetUserActivityUseCase } from './application/use-cases/get-user-activity.use-case';
import { ActivityRepository } from './infrastructure/activity.repository';

@Module({
  imports: [UsersModule],
  controllers: [ActivityController],
  providers: [
    ActivityRepository,
    ActivityUserPreconditionsService,
    GetUserActivityUseCase,
    CreateGeneratedActivityUseCase,
  ],
  exports: [CreateGeneratedActivityUseCase],
})
export class ActivityModule {}
