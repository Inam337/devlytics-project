import { Module } from '@nestjs/common';
import { SelfEvaluationsController } from './self-evaluations.controller';
import { SelfEvaluationsService } from './self-evaluations.service';

@Module({
  controllers: [SelfEvaluationsController],
  providers: [SelfEvaluationsService],
  exports: [SelfEvaluationsService],
})
export class SelfEvaluationsModule {}
