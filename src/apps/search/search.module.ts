import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { EventGateway } from '../socket/socket.controller';
import { ClientConnectionService } from '../socket/socket.service';

@Module({
  imports: [],
  controllers: [SearchController],
  providers: [SearchService, EventGateway, ClientConnectionService],
})
export class SearchModule {}
