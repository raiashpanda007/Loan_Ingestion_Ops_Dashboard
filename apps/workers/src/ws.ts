import { WebSocketServer } from 'ws';
import { client } from '@workspace/redis';

export const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', async (ws) => {
    console.log('New client connected');
    
    // Send current state to the newly connected client
    try {
        const [incomingCount, processedCount, failedCount] = await Promise.all([
            client.get('loan:incoming_count'),
            client.get('processed_count'),
            client.get('failed_count')
        ]);

        // Send initial counts to the new client
        ws.send(JSON.stringify({
            type: 'count:incoming',
            message: 'Initial incoming count',
            count: parseInt(incomingCount || '0', 10),
        }));

        ws.send(JSON.stringify({
            type: 'count:processed',
            message: 'Initial processed count',
            count: parseInt(processedCount || '0', 10),
        }));

        ws.send(JSON.stringify({
            type: 'count:failed',
            message: 'Initial failed count',
            count: parseInt(failedCount || '0', 10),
        }));

        console.log(`Sent initial data to new client: incoming=${incomingCount}, processed=${processedCount}, failed=${failedCount}`);
    } catch (error) {
        console.error('Error sending initial data to new client:', error);
    }
});

export function broadcast(type: string, payload: any) {
    wss.clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(JSON.stringify({ type, ...payload }));
        }
    });
}

// Track previous count to detect changes
let previousCount = 0;

// Monitor incoming count changes and broadcast updates
setInterval(async () => {
    try {
        const getCount = await client.get('loan:incoming_count');
        const currentCount = parseInt(getCount || '0', 10);
        
        if (currentCount !== previousCount) {
            broadcast('count:incoming', {
                message: 'Incoming count updated',
                count: currentCount,
                previousCount: previousCount,
                change: currentCount - previousCount
            });
            
            console.log(`Incoming count changed: ${previousCount} → ${currentCount}`);
            previousCount = currentCount;
        }
    } catch (error) {
        console.error('Error checking incoming count:', error);
    }
}, 1000);
