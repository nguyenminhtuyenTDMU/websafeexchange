import { type UseWebSocketReturn } from '@/hooks/use-websocket';
export declare function useWSContext(): UseWebSocketReturn | null;
interface WebSocketProviderProps {
    children: React.ReactNode;
}
export declare function WebSocketProvider({ children }: WebSocketProviderProps): import("react").JSX.Element;
export {};
