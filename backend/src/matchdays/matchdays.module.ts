import { Module } from '@nestjs/common';
import { MatchdaysService } from './matchdays.service';
import { MatchdaysController } from './matchdays.controller';

@Module({
  controllers: [MatchdaysController],
  providers: [MatchdaysService],
})
export class MatchdaysModule {}
