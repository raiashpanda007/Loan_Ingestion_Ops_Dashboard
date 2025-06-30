import IORedis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();
if (!process.env.REDIS_HOST) {
    throw new Error('REDIS_URL is not defined in .env file');
}

const client = new IORedis(process.env.REDIS_HOST, {
    maxRetriesPerRequest: null,
});
client.on('error', (err) => {
    console.error('Redis connection error:', err);
});
client.on('connect', () => {
    console.log('Redis client connected successfully');
});

export const connectRedis = async () => {
    if (client.status === 'ready' || client.status === 'connecting') {
        console.log('Redis client is already connected or connecting');
        return;
    }
    await client.connect();
    console.log('Redis client connected successfully');
};

export const disconnectRedis = async () => {
    await client.quit();
    console.log('Redis client disconnected successfully');
};
export default client;

export const redisConnectionConfig = {
    url: process.env.REDIS_HOST ,
    maxRetriesPerRequest: null,
}