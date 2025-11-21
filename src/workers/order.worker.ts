import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { orderProcessor } from './order.processor';

console.log('Worker starting... Redis URL present:', !!process.env.REDIS_URL);

const worker = new Worker(
    'trade-queue',
    orderProcessor,
    {
        connection: process.env.REDIS_URL
            ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null, family: 0 })
            : {
                host: process.env.REDIS_HOST || 'localhost',
                port: Number(process.env.REDIS_PORT) || 6379,
                password: process.env.REDIS_PASSWORD,
            },
        concurrency: 10,
        limiter: {
            max: 10,
            duration: 1000,
        },
    }
);

worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
    console.log(`Job ${job?.id} failed with ${err.message}`);
});

console.log('Worker started... (Structured Logging Enabled)');
