import { Worker } from 'bullmq';
import { orderProcessor } from './order.processor';

const worker = new Worker(
    'trade-queue',
    orderProcessor,
    {
        connection: {
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379,
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
