import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { log } from './index';

interface WSClient {
  ws: WebSocket;
  subscriptions: Set<string>;
}

class EventBroadcaster {
  private wss: WebSocketServer | null = null;
  private clients: Set<WSClient> = new Set();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    
    this.wss.on('connection', (ws) => {
      const client: WSClient = {
        ws,
        subscriptions: new Set(['all']),
      };
      
      this.clients.add(client);
      log('WebSocket client kết nối');

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(client, message);
        } catch (err) {
          console.error('Lỗi parse WebSocket message:', err);
        }
      });

      ws.on('close', () => {
        this.clients.delete(client);
        log('WebSocket client ngắt kết nối');
      });

      ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        this.clients.delete(client);
      });

      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Đã kết nối WebSocket',
        timestamp: new Date().toISOString(),
      }));
    });

    log('WebSocket server đã khởi tạo');
  }

  private handleMessage(client: WSClient, message: any) {
    switch (message.type) {
      case 'subscribe':
        if (message.channel) {
          client.subscriptions.add(message.channel);
          client.ws.send(JSON.stringify({
            type: 'subscribed',
            channel: message.channel,
          }));
        }
        break;

      case 'unsubscribe':
        if (message.channel) {
          client.subscriptions.delete(message.channel);
          client.ws.send(JSON.stringify({
            type: 'unsubscribed',
            channel: message.channel,
          }));
        }
        break;

      case 'ping':
        client.ws.send(JSON.stringify({ type: 'pong' }));
        break;

      default:
        break;
    }
  }

  broadcast(eventType: string, data: any, channels: string[] = ['all']) {
    const message = JSON.stringify({
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
    });

    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        const shouldSend = channels.some((channel) => 
          client.subscriptions.has(channel) || client.subscriptions.has('all')
        );
        
        if (shouldSend) {
          client.ws.send(message);
        }
      }
    });
  }

  broadcastTradeUpdate(tradeId: string, status: string, data: any = {}) {
    this.broadcast('trade_update', {
      tradeId,
      status,
      ...data,
    }, ['all', `trade:${tradeId}`]);
  }

  broadcastNewTrade(trade: any) {
    this.broadcast('new_trade', trade, ['all', 'trades']);
  }

  broadcastContractEvent(eventName: string, eventData: any) {
    this.broadcast('contract_event', {
      eventName,
      ...eventData,
    }, ['all', 'contracts']);
  }

  broadcastNotification(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    this.broadcast('notification', {
      title,
      message,
      type,
    }, ['all', 'notifications']);
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const eventBroadcaster = new EventBroadcaster();
