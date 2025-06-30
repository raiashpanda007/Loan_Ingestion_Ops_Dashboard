import { WebSocketServer } from 'ws';

export const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('New client connected');
})

export function broadcast(type: string, payload: any) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type, ...payload }));
    }
  });
}
