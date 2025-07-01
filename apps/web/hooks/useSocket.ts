import { useEffect } from 'react';

export const useSocket = (url: string, onMessage: (data: any) => void) => {
  useEffect(() => {
    const socket = new WebSocket(url);

    socket.onopen = () => {
      console.debug('[WebSocket] Connected');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        console.error('WebSocket message parse error:', err);
      }
    };

    socket.onerror = (err) => {
      console.error('[WebSocket] Error:', err);
    };

    socket.onclose = () => {
      console.warn('[WebSocket] Disconnected');
    };

    return () => {
      socket.close();
    };
  }, [url, onMessage]);
};
