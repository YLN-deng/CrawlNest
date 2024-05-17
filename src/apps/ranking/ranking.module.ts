import { Module } from '@nestjs/common';
import { RankingController } from './ranking.controller';
import { RankingService } from './ranking.service';
import { EventGateway } from '../socket/socket.controller';
import { ClientConnectionService } from '../socket/socket.service';

@Module({
  imports: [],
  controllers: [RankingController],
  providers: [RankingService, EventGateway, ClientConnectionService],
})
export class RankingModule {}
