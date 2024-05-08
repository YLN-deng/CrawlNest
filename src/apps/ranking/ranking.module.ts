import { Module } from '@nestjs/common';
import { RankingController } from './ranking.controller';
import { RankingService } from './ranking.service';

@Module({
  imports: [],
  controllers: [RankingController],
  providers: [RankingService],
})
export class RankingModule {}
