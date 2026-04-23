import type { Server } from 'http';
declare class EventBroadcaster {
    private wss;
    private clients;
    initialize(server: Server): void;
    private handleMessage;
    broadcast(eventType: string, data: any, channels?: string[]): void;
    broadcastTradeUpdate(tradeId: string, status: string, data?: any): void;
    broadcastNewTrade(trade: any): void;
    broadcastContractEvent(eventName: string, eventData: any): void;
    broadcastNotification(title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;
    sendToWallet(walletAddress: string, title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;
    sendToParticipants(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error', ...addresses: (string | null | undefined)[]): void;
    getClientCount(): number;
}
export declare const eventBroadcaster: EventBroadcaster;
export {};
