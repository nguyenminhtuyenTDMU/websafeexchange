export interface WSMessage {
    type: string;
    data?: any;
    timestamp?: string;
    message?: string;
}
export interface UseWebSocketReturn {
    isConnected: boolean;
    lastMessage: WSMessage | null;
    subscribe: (channel: string) => void;
    unsubscribe: (channel: string) => void;
}
export declare function useWebSocket(walletAddress?: string): UseWebSocketReturn;
