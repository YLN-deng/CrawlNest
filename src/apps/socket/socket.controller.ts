import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ClientConnectionService } from './socket.service';

@WebSocketGateway(9002, {
  cors: {
    origin: '*',
  },
})
export class EventGateway {
  @WebSocketServer()
  private server: Server;

  constructor(
    private readonly clientConnectionService: ClientConnectionService,
  ) {}

  handleConnection(userId: string, client: Socket) {
    if (userId) {
      // 将客户端连接对象保存到 ClientConnectionService 中
      this.clientConnectionService.addClient(userId, client);
    }
  }

  // 处理断开连接事件
  handleDisconnect(userId: string) {
    if (userId) {
      // 从 ClientConnectionService 中移除客户端连接对象
      this.clientConnectionService.removeClient(userId);
    }
  }

  // 接收消息并发送消息给指定用户
  @SubscribeMessage('nest-scoket')
  handleMessage(client: Socket, message: { userId: string }) {
    const { userId } = message;
    // 保存客户端用户
    this.handleConnection(userId, client);

    // 获取指定用户的客户端连接对象
    const userClient = this.clientConnectionService.getClient(userId);

    if (userClient) {
      // 发送消息给指定用户
      userClient.emit(userId, `${userId}: 登录成功`);
    } else {
      console.error(`ID 为 ${userId} 的用户未连接。`);
    }
  }

  // 发送消息给用户
  sendMessageUser(event: string, userId: string, content: any) {
    // 获取客户端连接对象
    const client = this.clientConnectionService.getClient(userId);
    if (userId) {
      // 向客户端指定用户发送消息
      client.emit(event, content);
    } else {
      console.error(`ID 为 ${userId} 的用户未连接。`);
    }
  }
}
