import { Module } from '@nestjs/common';
import { FindController } from './find.controller';
import { FindService } from './find.service';
import { EventGateway } from '../socket/socket.controller';
import { ClientConnectionService } from '../socket/socket.service';

@Module({
  imports: [],
  controllers: [FindController],
  providers: [FindService, EventGateway, ClientConnectionService],
})
export class RankingModule {}
