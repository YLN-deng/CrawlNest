import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';

@Injectable()
export class ClientConnectionService {
  private readonly clients: Map<string, Socket> = new Map<string, Socket>();

  // 添加客户端连接对象到 Map 中
  addClient(userId: string, client: Socket) {
    this.clients.set(userId, client);
  }

  // 从 Map 中移除客户端连接对象
  removeClient(userId: string) {
    this.clients.delete(userId);
  }

  // 获取指定用户的客户端连接对象
  getClient(userId: string): Socket | undefined {
    return this.clients.get(userId);
  }
}
