import { createContext, useContext, useEffect } from 'react';
import { useWebSocket, type UseWebSocketReturn } from '@/hooks/use-websocket';
import { queryClient } from '@/lib/queryClient';

const WebSocketContext = createContext<UseWebSocketReturn | null>(null);

export function useWSContext(): UseWebSocketReturn | null {
  return useContext(WebSocketContext);
}

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const ws = useWebSocket();

  useEffect(() => {
    if (ws.lastMessage) {
      switch (ws.lastMessage.type) {
        case 'trade_update':
        case 'new_trade':
          queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
          if (ws.lastMessage.data?.tradeId) {
            queryClient.invalidateQueries({ 
              queryKey: ['/api/trades', ws.lastMessage.data.tradeId] 
            });
          }
          break;
          
        case 'contract_event':
          queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
          break;
          
        default:
          break;
      }
    }
  }, [ws.lastMessage]);

  return (
    <WebSocketContext.Provider value={ws}>
      {children}
    </WebSocketContext.Provider>
  );
}
