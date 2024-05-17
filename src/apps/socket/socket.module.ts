import { Module } from '@nestjs/common';
import { ClientConnectionService } from './socket.service';
import { EventGateway } from './socket.controller';
@Module({
  providers: [ClientConnectionService, EventGateway],
})
export class GatewayModule {}
